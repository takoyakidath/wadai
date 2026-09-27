<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/user_auth.php';

$pdo = wadai_db();
wadai_require_user($pdo);

$token = wadai_bearer_token();
if ($token !== null) {
    wadai_invalidate_user_session($pdo, $token);
}

wadai_json(['ok' => true]);
