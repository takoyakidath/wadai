<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/auth.php';

$pdo = wadai_db();
wadai_require_admin($pdo);

$token = wadai_bearer_token();
if ($token !== null) {
    wadai_invalidate_session($pdo, $token);
}

wadai_json(['ok' => true]);
