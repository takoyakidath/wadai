<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/user_auth.php';
require_once __DIR__ . '/../lib/topics.php';
require_once __DIR__ . '/../lib/likes.php';

$pdo = wadai_db();
$userId = wadai_require_user($pdo);

if (!ctype_digit($topicId)) {
    wadai_error('not_found', 'Not found', 404);
}

if (wadai_get_topic_by_id($pdo, $topicId) === null) {
    wadai_error('not_found', 'Not found', 404);
}

wadai_add_like($pdo, $userId, $topicId);

wadai_json(['liked' => true]);
