<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/user_auth.php';
require_once __DIR__ . '/../lib/topics.php';
require_once __DIR__ . '/../lib/likes.php';

$pdo = wadai_db();
$userId = wadai_require_user($pdo);

wadai_json(['topics' => wadai_list_liked_topics($pdo, $userId)]);
