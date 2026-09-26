<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/topics.php';

if (!ctype_digit($topicId)) {
    wadai_error('not_found', 'Not found', 404);
}

$pdo = wadai_db();
$topic = wadai_get_deeper_topic($pdo, $topicId);

if ($topic === null) {
    wadai_error('no_deeper', 'この話題にはこれ以上の深め方がありません。', 404);
}

wadai_json($topic);
