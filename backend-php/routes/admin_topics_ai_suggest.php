<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/ai.php';

$pdo = wadai_db();
wadai_require_admin($pdo);

$input = wadai_read_json_body();
$categoryKey = is_string($input['categoryKey'] ?? null) ? $input['categoryKey'] : null;

$categoryLabel = null;
if ($categoryKey !== null && $categoryKey !== '') {
    $catStmt = $pdo->prepare('SELECT label FROM categories WHERE `key` = :key');
    $catStmt->execute([':key' => $categoryKey]);
    $category = $catStmt->fetch();
    $categoryLabel = $category !== false ? $category['label'] : null;
}

$chain = wadai_ai_generate_chain($categoryLabel, $categoryKey);
if ($chain === null) {
    wadai_error('ai_generation_failed', '生成に失敗しました。もう一度お試しください。', 503);
}

wadai_json(['chain' => $chain]);
