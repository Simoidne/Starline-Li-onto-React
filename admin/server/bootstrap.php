<?php
declare(strict_types=1);

require_once __DIR__ . '/src/Auth.php';
require_once __DIR__ . '/src/Products.php';
ini_set('display_errors', '0');
ini_set('log_errors', '1');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('X-Frame-Options: DENY');

function respond(array $body, int $status = 200): never
{
    http_response_code($status);
    if (!in_array($_GET['action'] ?? '', ['catalog','product-image'], true) && isset($_SESSION['csrf'])) $body['csrfToken'] = $_SESSION['csrf'];
    echo json_encode($body, JSON_THROW_ON_ERROR);
    exit;
}

try {
    $configFile = getenv('STARLINE_ADMIN_CONFIG') ?: __DIR__ . '/config.php';
    if (!is_file($configFile)) throw new RuntimeException('Configuration unavailable');
    $config = require $configFile;
    if (!is_array($config)) throw new RuntimeException('Configuration invalid');
    $config['app_url'] = rtrim($config['app_url'] ?? '', '/');
    $url = parse_url($config['app_url']);
    if (!$url || !isset($url['scheme'], $url['host']) || (isset($url['user']) || isset($url['pass'])) || !empty($url['query']) || !empty($url['fragment']) || !empty($url['path'])) throw new RuntimeException('Origin invalid');
    $development = ($config['environment'] ?? '') === 'development';
    $loopback = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true);
    if ($development && (!$loopback || !in_array($url['host'], ['localhost', '127.0.0.1', '::1'], true))) throw new RuntimeException('Development is restricted to loopback');
    if (!$development && (($config['environment'] ?? '') !== 'production' || $url['scheme'] !== 'https')) throw new RuntimeException('HTTPS configuration required');
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['SERVER_PORT'] ?? '') === '443';
    if (!$development && !$https) throw new ApiError(426, 'Use the secure HTTPS admin address.');
    if (!filter_var($config['mail_from'] ?? '', FILTER_VALIDATE_EMAIL)) throw new RuntimeException('Mail sender invalid');
    if (!in_array($config['mail_mode'] ?? '', ['mail', 'log'], true) || (!$development && $config['mail_mode'] !== 'mail')) throw new RuntimeException('Mail transport invalid');
    $config['bootstrap_key_hash'] = $config['bootstrap_key_hash'] ?? '';
    if ($config['bootstrap_key_hash'] !== '' && !preg_match('/\A[a-f0-9]{64}\z/', $config['bootstrap_key_hash'])) throw new RuntimeException('Setup hash invalid');
    foreach (['session_idle_seconds' => 1800, 'session_absolute_seconds' => 28800] as $key => $default) {
        $config[$key] = $config[$key] ?? $default;
        if (!is_int($config[$key]) || $config[$key] < 1 || $config[$key] > 86400) throw new RuntimeException('Session duration invalid');
    }
    $config['private_dir'] = __DIR__;
    umask(0077);
    foreach (['var', 'var/sessions', 'var/mail'] as $directory) {
        $path = __DIR__ . '/' . $directory;
        if (!is_dir($path) && !mkdir($path, 0700, true)) throw new RuntimeException('Private storage unavailable');
    }
    $action = $_GET['action'] ?? '';
    $public = is_string($action) && in_array($action, ['catalog', 'product-image'], true);
    // Public catalog requests never create sessions or return CSRF tokens.
    $needsSession = !$public || ($action === 'product-image' && isset($_COOKIE[$development ? 'starline_admin_dev' : '__Host-starline_admin']));
    if ($needsSession) {
        session_name($development ? 'starline_admin_dev' : '__Host-starline_admin');
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.use_trans_sid', '0');
        ini_set('session.gc_maxlifetime', (string) $config['session_absolute_seconds']);
        session_save_path(__DIR__ . '/var/sessions');
        session_cache_limiter('');
        session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => !$development, 'httponly' => true, 'samesite' => 'Strict']);
        if (!session_start()) throw new RuntimeException('Session unavailable');
        $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
    }
    $method = $_SERVER['REQUEST_METHOD'] ?? '';
    $action = $_GET['action'] ?? '';
    if (!is_string($action)) throw new ApiError(404, 'Endpoint not found.');
    $readActions = ['session', 'users', 'products', 'product', 'catalog', 'product-image'];
    $writeActions = ['bootstrap', 'login', 'logout', 'forgot-password', 'reset-password', 'change-password', 'invite', 'resend-invitation', 'set-access', 'product-save', 'product-delete', 'product-costs', 'product-upload', 'product-image-edit', 'product-image-delete'];
    if (!in_array($action, array_merge($readActions, $writeActions), true)) throw new ApiError(404, 'Endpoint not found.');
    $expectedMethod = in_array($action, $readActions, true) ? 'GET' : 'POST';
    if ($method !== $expectedMethod) { header('Allow: ' . $expectedMethod); throw new ApiError(405, 'Method not allowed.'); }
    // Reject cross-origin reads too, including same-site sibling subdomains.
    $allowedOrigin = $public ? ($config['public_url'] ?? $config['app_url']) : $config['app_url'];
    if (isset($_SERVER['HTTP_ORIGIN']) && $_SERVER['HTTP_ORIGIN'] !== $allowedOrigin) throw new ApiError(403, 'Request origin is not allowed.');
    $input = [];
    if ($method === 'POST') {
        if (($_SERVER['HTTP_ORIGIN'] ?? '') !== $config['app_url']) throw new ApiError(403, 'Request origin is not allowed.');
        if (!hash_equals($_SESSION['csrf'], $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) throw new ApiError(419, 'Your session changed. Please try again.');
        if ($action === 'product-upload') {
            if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'multipart/form-data') throw new ApiError(415, 'Multipart upload required.');
            $input = $_POST;
        } else {
            if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') throw new ApiError(415, 'JSON request required.');
            $raw = file_get_contents('php://input', false, null, 0, 16385);
            if ($raw === false || strlen($raw) > 16384) throw new ApiError(413, 'Request is too large.');
            try { $input = json_decode($raw, true, 16, JSON_THROW_ON_ERROR); }
            catch (JsonException) { throw new ApiError(400, 'Invalid JSON request.'); }
            if (!is_array($input) || !str_starts_with(ltrim($raw), '{')) throw new ApiError(400, 'JSON object required.');
        }
    }
    $database = $config['database'] ?? [];
    if (!str_starts_with($database['dsn'] ?? '', 'mysql:')) throw new RuntimeException('MySQL configuration required');
    $db = new PDO($database['dsn'], $database['username'] ?? '', $database['password'] ?? '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false]);
    $auth = new Auth($db, $config);
    // REMOTE_ADDR only; never trust a client-supplied forwarding header for rate limits.
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $products = new Products($db, $auth, $config);
    if ($action === 'product-image') {
        $products->serveImage(is_string($_GET['file'] ?? null) ? $_GET['file'] : '');
    }
    $body = match ($action) {
        'catalog' => $products->catalog(),
        'products' => $products->list(),
        'product' => $products->get(is_string($_GET['id'] ?? null) ? $_GET['id'] : ''),
        'product-save' => $products->save($input),
        'product-delete' => $products->delete($input),
        'product-costs' => $products->saveCosts($input),
        'product-upload' => $products->upload($input),
        'product-image-edit' => $products->imageEdit($input),
        'product-image-delete' => $products->imageEdit($input, true),
        'session' => $auth->session(),
        'bootstrap' => $auth->bootstrap($input, $ip),
        'login' => $auth->login($input, $ip),
        'logout' => $auth->logout(),
        'forgot-password' => $auth->forgotPassword($input, $ip),
        'reset-password' => $auth->resetPassword($input, $ip),
        'change-password' => $auth->changePassword($input, $ip),
        'users' => $auth->users(),
        'invite' => $auth->invite($input),
        'resend-invitation' => $auth->resend($input),
        'set-access' => $auth->setAccess($input),
    };
    respond($body);
} catch (ApiError $error) {
    respond(['error' => $error->getMessage()], $error->status);
} catch (Throwable $error) {
    error_log('Starline admin API failure: ' . get_class($error));
    respond(['error' => 'Sign-in service is unavailable. Please try again later or contact your administrator.'], 503);
}
