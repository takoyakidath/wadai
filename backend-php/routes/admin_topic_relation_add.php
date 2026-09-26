<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/auth.php';

$pdo = wadai_db();
wadai_require_admin($pdo);

if (!ctype_digit($topicId)) {
    wadai_error('not_found', 'Not found', 404);
}

$input = wadai_read_json_body();
$toTopicId = isset($input['toTopicId']) ? (string) $input['toTopicId'] : '';
$type = $input['type'] ?? '';

if (!ctype_digit($toTopicId) || !in_array($type, ['deepen', 'related'], true)) {
    wadai_error('invalid_input', 'toTopicId と type（deepen/related）を指定してください。', 400);
}

if ($toTopicId === $topicId) {
    wadai_error('invalid_input', '自分自身には接続できません。', 400);
}

$exists = $pdo->prepare('SELECT id FROM topics WHERE id = :id');
$exists->execute([':id' => $toTopicId]);
if ($exists->fetch() === false) {
    wadai_error('not_found', '接続先の話題が見つかりません。', 404);
}

$insert = $pdo->prepare(
    'INSERT IGNORE INTO topic_relations (from_topic_id, to_topic_id, relation_type) VALUES (:from, :to, :type)'
);
$insert->execute([':from' => $topicId, ':to' => $toTopicId, ':type' => $type]);

if ($type === 'related') {
    $insert->execute([':from' => $toTopicId, ':to' => $topicId, ':type' => $type]);
}

wadai_json(['ok' => true]);
