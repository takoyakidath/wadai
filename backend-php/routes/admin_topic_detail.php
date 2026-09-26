<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/auth.php';

$pdo = wadai_db();
wadai_require_admin($pdo);

if (!ctype_digit($topicId)) {
    wadai_error('not_found', 'Not found', 404);
}

$stmt = $pdo->prepare(
    'SELECT t.id, t.body, t.depth, t.is_starter, t.status, t.source,
            c.`key` AS category_key, c.label AS category_label
     FROM topics t LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.id = :id'
);
$stmt->execute([':id' => $topicId]);
$topic = $stmt->fetch();

if ($topic === false) {
    wadai_error('not_found', 'Not found', 404);
}

$relStmt = $pdo->prepare(
    'SELECT r.id AS relation_id, r.relation_type, t2.id AS topic_id, t2.body, t2.depth
     FROM topic_relations r JOIN topics t2 ON t2.id = r.to_topic_id
     WHERE r.from_topic_id = :id
     ORDER BY r.relation_type, r.display_order'
);
$relStmt->execute([':id' => $topicId]);

$relations = array_map(function ($row) {
    return [
        'relationId' => (string) $row['relation_id'],
        'type' => $row['relation_type'],
        'topic' => [
            'id' => (string) $row['topic_id'],
            'body' => $row['body'],
            'depth' => (int) $row['depth'],
        ],
    ];
}, $relStmt->fetchAll());

wadai_json([
    'id' => (string) $topic['id'],
    'body' => $topic['body'],
    'depth' => (int) $topic['depth'],
    'isStarter' => (bool) $topic['is_starter'],
    'status' => $topic['status'],
    'source' => $topic['source'],
    'categoryKey' => $topic['category_key'],
    'categoryLabel' => $topic['category_label'],
    'relations' => $relations,
]);
