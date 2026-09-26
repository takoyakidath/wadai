<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/auth.php';

$pdo = wadai_db();
wadai_require_admin($pdo);

$status = $_GET['status'] ?? 'pending';
$allowedStatuses = ['pending', 'approved', 'rejected', 'all'];
if (!in_array($status, $allowedStatuses, true)) {
    $status = 'pending';
}

$sql = 'SELECT s.id, s.body, s.category_id, c.key AS category_key, c.label AS category_label,
               s.status, s.flagged, s.flag_reasons, s.created_at
        FROM submissions s LEFT JOIN categories c ON c.id = s.category_id';
$params = [];
if ($status !== 'all') {
    $sql .= ' WHERE s.status = :status';
    $params[':status'] = $status;
}
$sql .= ' ORDER BY s.created_at DESC';

$stmt = $pdo->prepare($sql);
$stmt->execute($params);

$submissions = array_map(function ($row) {
    return [
        'id' => (string) $row['id'],
        'body' => $row['body'],
        'categoryKey' => $row['category_key'],
        'categoryLabel' => $row['category_label'],
        'status' => $row['status'],
        'flagged' => (bool) $row['flagged'],
        'flagReasons' => $row['flag_reasons'] !== '' ? explode(',', $row['flag_reasons']) : [],
        'createdAt' => $row['created_at'],
    ];
}, $stmt->fetchAll());

wadai_json(['submissions' => $submissions]);
