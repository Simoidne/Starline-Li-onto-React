<?php
declare(strict_types=1);
// Copy to config.php in the PRIVATE server directory. Never put it in the React build.
return [
    'environment' => 'production',
    'app_url' => 'https://admin.starline-li.com',
    'database' => [
        'dsn' => 'mysql:host=db5021782189.hosting-data.io;port=3306;dbname=dbs16289111;charset=utf8mb4',
        'username' => 'dbu4848212',
        'password' => 'YOUR_DATABASE_PASSWORD',
    ],
    // Generate a random setup code and its SHA-256 hash with scripts/setup-code.php.
    // Put ONLY the hash here. Enter the original code in the first-owner setup form.
    'bootstrap_key_hash' => '',
    'mail_from' => 'admin@starline-li.com',
    'mail_mode' => 'mail', // IONOS PHP mail(); development may use 'log'.
    'session_idle_seconds' => 1800,
    'session_absolute_seconds' => 28800,
];
