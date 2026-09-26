<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/auth.php';

$pdo = wadai_db();
wadai_require_admin($pdo);

if (!ctype_digit($relationId)) {
    wadai_error('not_found', 'Not found', 404);
}

$stmt = $pdo->prepare('SELECT from_topic_id, to_topic_id, relation_type FROM topic_relations WHERE id = :id');
$stmt->execute([':id' => $relationId]);
$relation = $stmt->fetch();

if ($relation === false) {
    wadai_error('not_found', 'Not found', 404);
}

$pdo->prepare('DELETE FROM topic_relations WHERE id = :id')->execute([':id' => $relationId]);

// related は対称なので、逆方向のエッジも一緒に消す
if ($relation['relation_type'] === 'related') {
    $pdo->prepare(
        'DELETE FROM topic_relations WHERE from_topic_id = :from AND to_topic_id = :to AND relation_type = "related"'
    )->execute([':from' => $relation['to_topic_id'], ':to' => $relation['from_topic_id']]);
}

wadai_json(['ok' => true]);
