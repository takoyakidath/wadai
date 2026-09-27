<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/auth.php';

$pdo = wadai_db();
wadai_require_admin($pdo);

$input = wadai_read_json_body();
$categoryKey = is_string($input['categoryKey'] ?? null) ? $input['categoryKey'] : null;
$texts = is_array($input['texts'] ?? null) ? array_values($input['texts']) : [];

if (count($texts) !== 4) {
    wadai_error('invalid_input', 'texts は4件（Lv.1〜4）で指定してください。', 400);
}
foreach ($texts as $text) {
    if (!is_string($text) || trim($text) === '' || mb_strlen($text) > 200) {
        wadai_error('invalid_body', '各質問文を確認してください（200文字以内）。', 400);
    }
}

$categoryId = null;
if ($categoryKey !== null && $categoryKey !== '') {
    $catStmt = $pdo->prepare('SELECT id FROM categories WHERE `key` = :key');
    $catStmt->execute([':key' => $categoryKey]);
    $category = $catStmt->fetch();
    $categoryId = $category !== false ? (int) $category['id'] : null;
}

$pdo->beginTransaction();
try {
    $insertTopic = $pdo->prepare(
        'INSERT INTO topics (body, category_id, depth, is_starter, status, source)
         VALUES (:body, :category_id, :depth, :is_starter, "published", "ai_generated")'
    );
    $insertRelation = $pdo->prepare(
        'INSERT INTO topic_relations (from_topic_id, to_topic_id, relation_type) VALUES (:from, :to, "deepen")'
    );

    $topicIds = [];
    foreach ($texts as $i => $text) {
        $depth = $i + 1;
        $insertTopic->execute([
            ':body' => trim($text),
            ':category_id' => $categoryId,
            ':depth' => $depth,
            ':is_starter' => $depth === 1 ? 1 : 0,
        ]);
        $topicIds[] = (int) $pdo->lastInsertId();
    }

    for ($i = 1; $i < count($topicIds); $i++) {
        $insertRelation->execute([':from' => $topicIds[$i - 1], ':to' => $topicIds[$i]]);
    }

    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
}

wadai_json(['topicIds' => array_map('strval', $topicIds)], 201);
