<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/user_auth.php';
require_once __DIR__ . '/../lib/topics.php';
require_once __DIR__ . '/../lib/likes.php';

$pdo = wadai_db();
$userId = wadai_require_user($pdo);

$topic = wadai_get_random_liked_topic($pdo, $userId);

if ($topic === null) {
    wadai_error('no_topic', 'マイカードにはまだ話題がありません。', 404);
}

wadai_json($topic);
