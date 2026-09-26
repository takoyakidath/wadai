<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/topics.php';

if (!ctype_digit($topicId)) {
    wadai_error('not_found', 'Not found', 404);
}

$pdo = wadai_db();
$topics = wadai_get_related_topics($pdo, $topicId);

wadai_json(['topics' => $topics]);
