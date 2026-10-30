# Starline Operations admin

React dashboard with a PHP 8.3+ backend and MariaDB/MySQL authentication, hosted on IONOS at **https://admin.starline-li.com**. Supabase has been removed. The public seafood website remains a separate application.

## What is implemented

- One-time first-owner setup using a private random setup code; setup automatically creates only the prefixed authentication tables if needed.
- Email/password sign-in, server-side sessions, sign-out, role checks, password changes, recovery and invitation links.
- Owner-only staff invitations, role assignment, disabling accounts and resending password links. The PHP API enforces these permissions.
- Bcrypt password hashing, prepared SQL, per-account/IP login limits, CSRF checks, exact-origin checks, and HTTPS-only production sessions.
- Existing cost calculator and role-specific dashboard cards. Shipment data is still session-local example data; there is no persistent shipment database yet.

## IONOS layout

Use these sibling folders in the SFTP root:

```text
/build/                     Existing public website
/admin/                     Admin React build and api/index.php
/starline-admin-private/    PHP code, config.php, SQL, and private session files
```

Point **admin.starline-li.com** to **/admin**, enable SSL, and select PHP 8.3 or newer with PDO MySQL. The private folder must remain outside every domain's document root. It also contains a deny-all `.htaccess` as a second layer. Do not upload the whole repository into a domain's document root.

The production `.htaccess` redirects HTTP requests to https://admin.starline-li.com. The API also rejects non-HTTPS production requests. The subdomain must execute PHP; static-only hosting cannot run this backend.

## Database and private configuration

The provided `server/config.example.php` includes the non-secret IONOS details:

| Setting           | Value                        |
| ----------------- | ---------------------------- |
| Host              | db5021782189.hosting-data.io |
| Port              | 3306                         |
| Database          | dbs16289111                  |
| User              | dbu4848212                   |
| Server            | MariaDB 11.8                 |
| Storage allowance | 2 GB                         |

Copy `server/config.example.php` to `server/config.php`, then enter the database password there. This file is ignored by Git and excluded from deployment packages. The live copy belongs at `/starline-admin-private/config.php`, never `/admin` or a `REACT_APP_*` variable. Give it the most restrictive permissions supported by hosting, ideally 600.

The authentication tables use the `starline_admin_` prefix and leave existing tables untouched. First-owner setup executes `server/migrations/001_auth.sql` only while installation is incomplete; alternatively import it using IONOS phpMyAdmin. Normal API operations require SELECT/INSERT/UPDATE/DELETE; initial setup also requires CREATE/REFERENCES on this database.

Generate a private first-owner code locally:

```sh
php scripts/setup-code.php
```

Keep the original code private and copy its `bootstrap_key_hash` into `config.php`. Once deployed, open the admin site and enter the code, name, email and a password to create the first owner. Initialization is recorded in the database and cannot be repeated through the setup endpoint, even if the account is later deleted. Clear `bootstrap_key_hash` in the live config after successful setup.

Set `mail_from` to an address on a domain in the same IONOS contract. It defaults to `admin@starline-li.com`; confirm this sender is allowed for your hosting. Production recovery and invitation emails use IONOS PHP `mail()`. A successful response means mail was accepted by the local mail service, not guaranteed delivery. Test a real invitation and recovery email before relying on them. No email is sent during local automated tests.

IONOS databases are normally reachable only from IONOS hosting. A database connection failure from your Mac does not prove the credentials are wrong.

## Build and deploy

Use Node.js 22 or newer for the frontend:

```sh
cd admin
npm ci
npm run package
```

The package appears under `admin/deploy/<timestamp>/` with `admin/` and `starline-admin-private/` subfolders. Upload these folders to the SFTP root. Only production PHP files and schema files are packaged; actual credentials, tests, captured mail and sessions are excluded. Upload the separately configured private `config.php` with SFTP. Preserve the live `config.php` and `var/` directory during later deployments. Do not mirror-delete the hosting root.

The standard entry point uses the sibling layout above. If hosting requires another private location, set the server environment variable `STARLINE_ADMIN_PRIVATE` or update only the PHP entry-point path. No frontend secrets or Supabase environment variables are required.

## Local development

PHP and a local MySQL-compatible database are needed in addition to Node. On this Mac, PHP 8.3 was installed at `/opt/homebrew/opt/php@8.3/bin/php`; add `/opt/homebrew/opt/php@8.3/bin` to your shell PATH if `php` is unavailable. MariaDB was installed for testing without starting a persistent background service.

Create an ignored `server/config.php` using a separate **local development database**, with:

```php
'environment' => 'development',
'app_url' => 'http://localhost:3001',
'mail_mode' => 'log',
```

Set its local database connection and setup hash, then run two terminals from `admin/`:

```sh
npm run backend
npm start
```

Open http://localhost:3001. The development proxy sends `/api` requests to PHP on 127.0.0.1:8081 before CRA can serve PHP source files. Development mode works only on loopback, with a localhost app URL. Recovery/invitation messages are captured in ignored `server/var/mail/`; inspect a local test message to use its link. Never enable this mail mode in production.

## Account and security behavior

Only an owner can invite or change other users. Roles are Owner, Operations and Sales. There is no public signup or frontend role selector. Owners cannot change their own access; another owner must do that. Invited users start without a usable password and receive a one-use setup link. Invitation links expire after 48 hours; recovery links after 30 minutes. Creating a new link invalidates the previous one for that user.

Passwords must contain at least 12 characters and at most 72 UTF-8 bytes, matching bcrypt's input limit. A signed-in password change also requires the current password. Password changes, password resets, disabling an account and changing its role increment the account's session version; old sessions fail the next API check. They also invalidate outstanding password links. For a pending invitation whose access was changed, send a fresh password link.

Production cookies are host-only `__Host-starline_admin`, Secure, HttpOnly and SameSite=Strict. No session tokens or passwords are kept in browser local storage. Sessions expire after 30 minutes without an API request, or after 8 hours regardless of activity. The dashboard rechecks access when focused and every minute while visible, so that polling counts as API activity. Every protected PHP action independently checks the account's current role, status and session version.

All mutations use JSON POST, an exact Origin check and a server-issued CSRF token. Session IDs and CSRF tokens rotate on login, logout and password updates. Reset tokens travel in the email link's URL fragment, are cleared from the address bar and sent to PHP only in a POST body. Only SHA-256 hashes of those high-entropy random tokens are stored in the database.

Login limits: 10 attempts per normalized email and 40 per IP within 15 minutes. Recovery email requests: 3 per email and 15 per IP per 15 minutes. Old rate-limit rows are periodically removed. The account and token tables are small relative to 2 GB; each account has at most one outstanding password token. PHP session files are stored outside the database. Store future documents/images in files rather than database blobs, and monitor database size as shipment history grows.

Role-specific dashboard cards are presentation choices. All enabled roles currently have the calculator. Any future business-data endpoint must call `requireUser()` and enforce record ownership / role permissions server-side; hiding a React component is not an authorization check.

## Verification

```sh
npm test -- --watchAll=false --runInBand
python3 server/tests/integration.py
npm run build
```

The Python integration suite initializes a disposable local MariaDB database, starts a loopback PHP server, captures test mail, and exercises real HTTP cookies, schema initialization, setup, login, roles, CSRF, recovery, revocation and throttling. It shuts down its temporary services. It never connects to IONOS or sends real mail. Set `PHP_BIN` and `MARIADB_BIN` if your executable paths differ; on Linux install the equivalent PHP/MySQL packages first. The code uses SQL supported by MariaDB 11.8; verify the live hosting PHP, schema privileges and mail delivery before production use.

## Calculation conventions

- All weights are kilograms; purchase price is per purchased kg.
- Additional costs are totals per shipment, each in its selected currency.
- Rates mean **CAD per 1 foreign currency unit**. CAD is the reporting currency and fixed at 1. The initial rates are illustrative, not current market data. Updates affect both the calculator and converter immediately.
- Purchase cost = purchased kg × purchase price × purchase currency's CAD rate.
- Landed cost = purchase cost + all converted shipment expenses.
- Saleable kg = purchased kg × yield percentage / 100. Cost per saleable kg includes the cost of expected losses.
- Selling price is CAD per saleable kg; gross profit = planned revenue − landed cost. Gross margin = gross profit / revenue, not markup. Zero revenue has no defined margin.
- Duties, taxes, overhead, and financing are not inferred or automatically calculated. Add applicable non-recoverable amounts explicitly. Carry bank fees / spreads in the rates or as a separate cost, without double counting.
- Calculations retain full precision until display; displayed rounded components can differ slightly from the rounded total. Currency amounts use JavaScript numbers; audited settlement and invoice accounting need a defined decimal-rounding policy on the backend.

## References

- [IONOS database access](https://www.ionos.com/help/hosting/using-php-for-web-projects/connect-to-mysql-databases-using-php-code-examples/)
- [IONOS email sender requirements](https://www.ionos.com/help/hosting/no-sending-of-emails-with-a-different-sender-address/)
- [PHP password hashing](https://www.php.net/manual/en/function.password-hash.php)
- [PHP session security](https://www.php.net/manual/en/session.security.ini.php)
