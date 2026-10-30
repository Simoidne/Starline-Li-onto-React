<?php
declare(strict_types=1);

final class ApiError extends RuntimeException
{
    public function __construct(public int $status, string $message) { parent::__construct($message); }
}

final class Auth
{
    private const ROLES = ['owner' => 'Owner', 'operations' => 'Operations Manager'];
    // A valid bcrypt hash used to keep unknown-user password checks comparably expensive.
    private const DUMMY_HASH = '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';

    public function __construct(private PDO $db, private array $config) {}

    private function query(string $sql, array $values = []): PDOStatement
    {
        $statement = $this->db->prepare($sql);
        $statement->execute($values);
        return $statement;
    }

    private function transaction(callable $operation): mixed
    {
        $this->db->beginTransaction();
        try { $result = $operation(); $this->db->commit(); return $result; }
        catch (Throwable $error) { if ($this->db->inTransaction()) $this->db->rollBack(); throw $error; }
    }

    public static function text(array $input, string $field, int $max = 254): string
    {
        if (!isset($input[$field]) || !is_string($input[$field]) || strlen($input[$field]) > $max) {
            throw new ApiError(422, 'Please complete all fields with valid values.');
        }
        return $input[$field];
    }

    private static function email(array $input): string
    {
        $email = strtolower(trim(self::text($input, 'email')));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) throw new ApiError(422, 'Enter a valid email address.');
        return $email;
    }

    private static function name(array $input): string
    {
        $name = trim(self::text($input, 'name', 480));
        if (!preg_match('/\A[^\x00-\x1F\x7F]{1,120}\z/u', $name)) throw new ApiError(422, 'Enter a name of 1 to 120 characters.');
        return $name;
    }

    private static function newPassword(array $input): string
    {
        $password = self::text($input, 'password', 72);
        if (str_contains($password, "\0") || !preg_match('/\A.{12,}\z/us', $password)) {
            throw new ApiError(422, 'Use at least 12 characters and at most 72 bytes for your password.');
        }
        return $password;
    }

    private static function role(array $input): string
    {
        $role = self::text($input, 'role', 20);
        if (!isset(self::ROLES[$role])) throw new ApiError(422, 'Choose a valid role.');
        return $role;
    }

    private static function profile(array $row): array
    {
        return ['id' => (string) $row['id'], 'email' => $row['email'], 'name' => $row['display_name'], 'role' => self::ROLES[$row['role']]];
    }

    private function clearSession(): void
    {
        $_SESSION = [];
        session_regenerate_id(true);
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }

    private function startLogin(array $row): array
    {
        $this->clearSession();
        $_SESSION['user_id'] = (string) $row['id'];
        $_SESSION['auth_version'] = (int) $row['auth_version'];
        $_SESSION['started_at'] = $_SESSION['last_seen'] = time();
        return self::profile($row);
    }

    public function currentUser(): ?array
    {
        if (!isset($_SESSION['user_id'])) return null;
        $row = $this->query('SELECT * FROM starline_admin_users WHERE id = ?', [$_SESSION['user_id']])->fetch();
        $expired = time() - ($_SESSION['last_seen'] ?? 0) > $this->config['session_idle_seconds']
            || time() - ($_SESSION['started_at'] ?? 0) > $this->config['session_absolute_seconds'];
        if (!$row || !$row['active'] || !isset(self::ROLES[$row['role']]) || $expired
            || (int) $row['auth_version'] !== ($_SESSION['auth_version'] ?? 0)) {
            $this->clearSession();
            return null;
        }
        $_SESSION['last_seen'] = time();
        return self::profile($row);
    }

    public function requireUser(?string $role = null): array
    {
        $user = $this->currentUser();
        if (!$user) throw new ApiError(401, 'Please sign in again.');
        if ($role && $user['role'] !== self::ROLES[$role]) throw new ApiError(403, 'You do not have permission to do that.');
        return $user;
    }

    public function session(): array
    {
        try { $installation = $this->query('SELECT initialized_at FROM starline_admin_installation WHERE id = 1')->fetch(); }
        catch (PDOException $error) {
            if (($error->errorInfo[1] ?? null) === 1146) return ['user' => null, 'setupRequired' => true];
            throw $error;
        }
        if (!$installation) throw new RuntimeException('Installation schema missing');
        return ['user' => $this->currentUser(), 'setupRequired' => $installation['initialized_at'] === null];
    }

    // Atomic, shared between PHP workers, independent of cookies/session rotation.
    private function throttle(string $namespace, string $identity, int $limit, int $window = 900): void
    {
        $bucket = hash('sha256', $namespace . ':' . $identity);
        $allowed = $this->transaction(function () use ($bucket, $limit, $window) {
            $this->query('INSERT IGNORE INTO starline_admin_rate_limits (bucket, window_started, attempts) VALUES (?, ?, 0)', [$bucket, time()]);
            $row = $this->query('SELECT * FROM starline_admin_rate_limits WHERE bucket = ? FOR UPDATE', [$bucket])->fetch();
            $start = (int) $row['window_started'];
            $count = (int) $row['attempts'];
            if (time() - $start >= $window) { $start = time(); $count = 0; }
            if ($count >= $limit) return false;
            $this->query('UPDATE starline_admin_rate_limits SET window_started = ?, attempts = ? WHERE bucket = ?', [$start, $count + 1, $bucket]);
            return true;
        });
        if (!$allowed) throw new ApiError(429, 'Too many attempts. Please wait 15 minutes before trying again.');
        if (random_int(1, 100) === 1) $this->query('DELETE FROM starline_admin_rate_limits WHERE window_started < ?', [time() - 86400]);
    }

    public function bootstrap(array $input, string $ip): array
    {
        $code = self::text($input, 'setupCode', 128);
        $expected = $this->config['bootstrap_key_hash'];
        if (!$expected || !hash_equals($expected, hash('sha256', $code))) throw new ApiError(403, 'The setup code is incorrect or setup is unavailable.');
        // A private setup code is required before initializing any tables.
        // CREATE IF NOT EXISTS also repairs an interrupted initial schema import.
        if ($this->session()['setupRequired']) {
            $schema = file_get_contents(__DIR__ . '/../migrations/001_auth.sql');
            if ($schema === false) throw new RuntimeException('Installation schema unavailable');
            $this->db->exec($schema);
        }
        $this->throttle('bootstrap', $ip, 5);
        $email = self::email($input); $name = self::name($input); $password = self::newPassword($input);
        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $row = $this->transaction(function () use ($email, $name, $hash) {
            $installation = $this->query('SELECT initialized_at FROM starline_admin_installation WHERE id = 1 FOR UPDATE')->fetch();
            if (!$installation || $installation['initialized_at'] !== null || $this->query('SELECT COUNT(*) FROM starline_admin_users')->fetchColumn() > 0) {
                throw new ApiError(409, 'First-owner setup is already complete.');
            }
            $this->query("INSERT INTO starline_admin_users (email, display_name, password_hash, role, created_at) VALUES (?, ?, ?, 'owner', ?)", [$email, $name, $hash, time()]);
            $id = $this->db->lastInsertId();
            $this->query('UPDATE starline_admin_installation SET initialized_at = ? WHERE id = 1', [time()]);
            return $this->query('SELECT * FROM starline_admin_users WHERE id = ?', [$id])->fetch();
        });
        return ['user' => $this->startLogin($row), 'setupRequired' => false];
    }

    public function login(array $input, string $ip): array
    {
        $this->throttle('login-ip', $ip, 40);
        $email = self::email($input);
        $this->throttle('login-account', $email, 10);
        $password = self::text($input, 'password', 72);
        if (str_contains($password, "\0")) throw new ApiError(401, 'The email or password is incorrect.');
        // Hold the user lock through password verification and session establishment,
        // so password changes cannot race a login using the old password/version.
        return $this->transaction(function () use ($email, $password) {
            $row = $this->query('SELECT * FROM starline_admin_users WHERE email = ? FOR UPDATE', [$email])->fetch();
            $valid = password_verify($password, $row['password_hash'] ?? self::DUMMY_HASH);
            if (!$row || !$valid || !$row['active'] || !isset(self::ROLES[$row['role']])) throw new ApiError(401, 'The email or password is incorrect.');
            if (password_needs_rehash($row['password_hash'], PASSWORD_BCRYPT, ['cost' => 12])) {
                $this->query('UPDATE starline_admin_users SET password_hash = ? WHERE id = ?', [password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]), $row['id']]);
            }
            return ['user' => $this->startLogin($row), 'setupRequired' => false];
        });
    }

    public function logout(): array { $this->clearSession(); return ['user' => null]; }

    private function sendPasswordLink(array $user, string $purpose): bool
    {
        $token = bin2hex(random_bytes(32));
        $this->transaction(function () use ($user, $token, $purpose) {
            $current = $this->query('SELECT * FROM starline_admin_users WHERE id = ? FOR UPDATE', [$user['id']])->fetch();
            if (!$current || !$current['active']) throw new ApiError(409, 'This account is not active.');
            $this->query('DELETE FROM starline_admin_password_tokens WHERE user_id = ?', [$user['id']]);
            $this->query('INSERT INTO starline_admin_password_tokens (token_hash, user_id, auth_version, expires_at) VALUES (?, ?, ?, ?)', [hash('sha256', $token), $user['id'], $current['auth_version'], time() + ($purpose === 'invite' ? 172800 : 1800)]);
        });
        // Fragment stays out of server access logs and HTTP referrer headers.
        $link = $this->config['app_url'] . '/#reset=' . $token;
        $subject = $purpose === 'invite' ? 'Your Starline admin invitation' : 'Reset your Starline admin password';
        $duration = $purpose === 'invite' ? '48 hours' : '30 minutes';
        $body = "Use the link below to set your Starline admin password. It expires in $duration and can be used once.\n\n$link\n\nIf you did not expect this message, you can ignore it.\n";
        if ($this->config['mail_mode'] === 'log') {
            // Only allowed for loopback development by bootstrap.php.
            $path = $this->config['private_dir'] . '/var/mail/' . bin2hex(random_bytes(16)) . '.json';
            $written = file_put_contents($path, json_encode(['to' => $user['email'], 'subject' => $subject, 'body' => $body], JSON_THROW_ON_ERROR), LOCK_EX);
            if ($written !== false) chmod($path, 0600);
            return $written !== false;
        }
        $sent = mail($user['email'], $subject, $body, ['From' => $this->config['mail_from'], 'Content-Type' => 'text/plain; charset=UTF-8']);
        if (!$sent) error_log('Starline admin: password email could not be handed to the mail service.');
        return $sent;
    }

    public function forgotPassword(array $input, string $ip): array
    {
        $this->throttle('reset-ip', $ip, 15);
        $email = self::email($input);
        // Account limiting is deliberately silent to avoid exposing account existence.
        try { $this->throttle('reset-account', $email, 3); }
        catch (ApiError $error) { if ($error->status !== 429) throw $error; return ['ok' => true]; }
        $row = $this->query('SELECT * FROM starline_admin_users WHERE email = ? AND active = 1', [$email])->fetch();
        if ($row) {
            try { $this->sendPasswordLink($row, 'reset'); }
            catch (Throwable) { error_log('Starline admin: password recovery could not be sent.'); }
        }
        return ['ok' => true];
    }

    public function resetPassword(array $input, string $ip): array
    {
        $this->throttle('reset-consume', $ip, 15);
        $token = self::text($input, 'token', 64);
        if (!preg_match('/\A[a-f0-9]{64}\z/', $token)) throw new ApiError(422, 'This link is invalid or expired. Request a new link.');
        $password = self::newPassword($input);
        $hash = hash('sha256', $token);
        $this->transaction(function () use ($hash, $password) {
            $candidate = $this->query('SELECT user_id FROM starline_admin_password_tokens WHERE token_hash = ?', [$hash])->fetch();
            if (!$candidate) throw new ApiError(422, 'This link is invalid or expired. Request a new link.');
            $user = $this->query('SELECT * FROM starline_admin_users WHERE id = ? FOR UPDATE', [$candidate['user_id']])->fetch();
            $stored = $this->query('SELECT * FROM starline_admin_password_tokens WHERE token_hash = ? FOR UPDATE', [$hash])->fetch();
            if (!$user || !$user['active'] || !$stored || (int) $stored['expires_at'] <= time() || (int) $stored['auth_version'] !== (int) $user['auth_version']) {
                throw new ApiError(422, 'This link is invalid or expired. Request a new link.');
            }
            $this->query('UPDATE starline_admin_users SET password_hash = ?, auth_version = auth_version + 1 WHERE id = ?', [password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]), $user['id']]);
            $this->query('DELETE FROM starline_admin_password_tokens WHERE user_id = ?', [$user['id']]);
        });
        $this->clearSession();
        return ['ok' => true, 'user' => null];
    }

    public function changePassword(array $input, string $ip): array
    {
        $user = $this->requireUser();
        $this->throttle('change-password', $user['id'], 10);
        $old = self::text($input, 'currentPassword', 72);
        $password = self::newPassword($input);
        $this->transaction(function () use ($user, $old, $password) {
            $row = $this->query('SELECT * FROM starline_admin_users WHERE id = ? FOR UPDATE', [$user['id']])->fetch();
            if (!$row || !$row['active'] || (int) $row['auth_version'] !== ($_SESSION['auth_version'] ?? 0)) throw new ApiError(401, 'Please sign in again.');
            if (str_contains($old, "\0") || !password_verify($old, $row['password_hash'] ?? self::DUMMY_HASH)) throw new ApiError(422, 'Your current password is incorrect.');
            $this->query('UPDATE starline_admin_users SET password_hash = ?, auth_version = auth_version + 1 WHERE id = ?', [password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]), $user['id']]);
            $this->query('DELETE FROM starline_admin_password_tokens WHERE user_id = ?', [$user['id']]);
        });
        $this->clearSession();
        return ['ok' => true, 'user' => null];
    }

    public function users(): array
    {
        $this->requireUser('owner');
        $rows = $this->query('SELECT id, email, display_name, role, active, password_hash IS NOT NULL AS password_set FROM starline_admin_users ORDER BY id')->fetchAll();
        return ['users' => array_map(fn($row) => self::profile($row) + ['active' => (bool) $row['active'], 'passwordSet' => (bool) $row['password_set']], $rows)];
    }

    public function invite(array $input): array
    {
        $owner = $this->requireUser('owner');
        $this->throttle('invite', $owner['id'], 20);
        $email = self::email($input); $name = self::name($input); $role = self::role($input);
        $user = $this->transaction(function () use ($email, $name, $role) {
            $this->query('SELECT id FROM starline_admin_installation WHERE id = 1 FOR UPDATE');
            $this->requireUser('owner');
            if ($this->query('SELECT id FROM starline_admin_users WHERE email = ?', [$email])->fetch()) throw new ApiError(409, 'An account already exists for this email.');
            $this->query('INSERT INTO starline_admin_users (email, display_name, role, created_at) VALUES (?, ?, ?, ?)', [$email, $name, $role, time()]);
            return $this->query('SELECT * FROM starline_admin_users WHERE id = ?', [$this->db->lastInsertId()])->fetch();
        });
        $sent = $this->sendPasswordLink($user, 'invite');
        return ['ok' => true, 'mailAccepted' => $sent];
    }

    public function resend(array $input): array
    {
        $owner = $this->requireUser('owner');
        $this->throttle('invite', $owner['id'], 20);
        $id = self::text($input, 'id', 20);
        $user = $this->query('SELECT * FROM starline_admin_users WHERE id = ?', [$id])->fetch();
        if (!$user || !$user['active']) throw new ApiError(404, 'Active account not found.');
        return ['ok' => true, 'mailAccepted' => $this->sendPasswordLink($user, 'invite')];
    }

    public function setAccess(array $input): array
    {
        $owner = $this->requireUser('owner');
        $id = self::text($input, 'id', 20); $role = self::role($input);
        if (!isset($input['active']) || !is_bool($input['active'])) throw new ApiError(422, 'Choose an active or disabled status.');
        if ($id === $owner['id']) throw new ApiError(422, 'Another owner must change your access.');
        $this->transaction(function () use ($id, $role, $input) {
            $this->query('SELECT id FROM starline_admin_installation WHERE id = 1 FOR UPDATE');
            $this->requireUser('owner');
            $target = $this->query('SELECT * FROM starline_admin_users WHERE id = ? FOR UPDATE', [$id])->fetch();
            if (!$target) throw new ApiError(404, 'Account not found.');
            if ($target['role'] === 'owner' && $target['active'] && ($role !== 'owner' || !$input['active'])) {
                if ($this->query("SELECT COUNT(*) FROM starline_admin_users WHERE role = 'owner' AND active = 1")->fetchColumn() <= 1) throw new ApiError(409, 'At least one active owner is required.');
            }
            $this->query('UPDATE starline_admin_users SET role = ?, active = ?, auth_version = auth_version + 1 WHERE id = ?', [$role, $input['active'] ? 1 : 0, $id]);
            $this->query('DELETE FROM starline_admin_password_tokens WHERE user_id = ?', [$id]);
        });
        return ['ok' => true];
    }
}
