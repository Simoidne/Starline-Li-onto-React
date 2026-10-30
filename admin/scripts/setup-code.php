<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$code = bin2hex(random_bytes(32));
echo "First-owner setup code (keep private):\n" . $code . "\n\n";
echo "bootstrap_key_hash (copy into server/config.php):\n" . hash('sha256', $code) . "\n";
