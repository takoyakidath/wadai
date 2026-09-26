<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/topics.php';

$pdo = wadai_db();

$categoryKey = isset($_GET['category']) && $_GET['category'] !== '' ? $_GET['category'] : null;
$excludeIds = [];
if (isset($_GET['exclude']) && $_GET['exclude'] !== '') {
    $excludeIds = array_map('trim', explode(',', $_GET['exclude']));
}

$topic = wadai_get_random_topic($pdo, $categoryKey, $excludeIds);

if ($topic === null) {
    wadai_error('no_topic', '該当する話題が見つかりませんでした。', 404);
}

wadai_json($topic);
