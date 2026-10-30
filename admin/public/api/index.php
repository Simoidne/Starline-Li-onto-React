<?php
declare(strict_types=1);
// The default deployment uses sibling /admin and /starline-admin-private folders.
$private = getenv('STARLINE_ADMIN_PRIVATE') ?: dirname(__DIR__, 2) . '/starline-admin-private';
if (!is_file($private . '/bootstrap.php')) {
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode(['error' => 'Sign-in service is not configured. Contact your administrator.']);
    exit;
}
require $private . '/bootstrap.php';
