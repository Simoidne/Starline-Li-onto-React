<?php
declare(strict_types=1);
$action = $_GET['action'] ?? '';
if (!is_string($action) || !in_array($action, ['catalog', 'product-image'], true)) {
    http_response_code(404); header('Content-Type: application/json'); echo '{"error":"Endpoint not found."}'; exit;
}
$private = getenv('STARLINE_ADMIN_PRIVATE') ?: dirname(__DIR__) . '/starline-admin-private';
if (!is_file($private . '/bootstrap.php')) {
    http_response_code(503); header('Content-Type: application/json'); echo '{"error":"Catalog unavailable."}'; exit;
}
require $private . '/bootstrap.php';
