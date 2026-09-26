<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/topics.php';

$pdo = wadai_db();
$categories = array_map(
    fn($row) => ['key' => $row['key'], 'label' => $row['label']],
    wadai_list_categories($pdo)
);

wadai_json(['categories' => $categories]);
