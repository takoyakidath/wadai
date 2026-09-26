<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/auth.php';

$pdo = wadai_db();
wadai_require_admin($pdo);

$search = trim($_GET['search'] ?? '');

$sql = 'SELECT t.id, t.body, t.depth, t.is_starter, t.status, t.source, t.draw_count,
               c.`key` AS category_key, c.label AS category_label
        FROM topics t LEFT JOIN categories c ON c.id = t.category_id';
$params = [];
if ($search !== '') {
    $sql .= ' WHERE t.body LIKE :search';
    $params[':search'] = "%{$search}%";
}
$sql .= ' ORDER BY t.id DESC LIMIT 200';

$stmt = $pdo->prepare($sql);
$stmt->execute($params);

$topics = array_map(function ($row) {
    return [
        'id' => (string) $row['id'],
        'body' => $row['body'],
        'depth' => (int) $row['depth'],
        'isStarter' => (bool) $row['is_starter'],
        'status' => $row['status'],
        'source' => $row['source'],
        'drawCount' => (int) $row['draw_count'],
        'categoryKey' => $row['category_key'],
        'categoryLabel' => $row['category_label'],
    ];
}, $stmt->fetchAll());

wadai_json(['topics' => $topics]);
