<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/user_auth.php';
require_once __DIR__ . '/../lib/topics.php';
require_once __DIR__ . '/../lib/moderation.php';
require_once __DIR__ . '/../lib/ai.php';

$pdo = wadai_db();
$userId = wadai_require_user($pdo);

if (!ctype_digit($topicId)) {
    wadai_error('not_found', 'Not found', 404);
}

$stmt = $pdo->prepare(
    'SELECT t.id, t.body, t.depth, t.category_id, c.label AS category_label
     FROM topics t LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.id = :id AND t.status = "published"'
);
$stmt->execute([':id' => $topicId]);
$parent = $stmt->fetch();

if ($parent === false) {
    wadai_error('not_found', 'Not found', 404);
}

$nextDepth = (int) $parent['depth'] + 1;
if ($nextDepth > 4) {
    wadai_error('max_depth', 'これ以上はAIでも深められません（最大の深さです）。', 400);
}

if (wadai_ai_daily_count($pdo, $userId) >= WADAI_AI_DAILY_LIMIT_PER_USER) {
    wadai_error('ai_limit_reached', '本日のAI生成回数の上限に達しました。また明日お試しください。', 429);
}

$generatedBody = wadai_ai_generate_deeper_topic($parent['body'], $nextDepth, $parent['category_label']);
if ($generatedBody === null) {
    wadai_error('ai_generation_failed', '今は生成できませんでした。もう一度お試しください。', 503);
}

$pdo->beginTransaction();
try {
    $insertTopic = $pdo->prepare(
        'INSERT INTO topics (body, category_id, depth, is_starter, status, source)
         VALUES (:body, :category_id, :depth, 0, "published", "ai_generated")'
    );
    $insertTopic->execute([
        ':body' => $generatedBody,
        ':category_id' => $parent['category_id'],
        ':depth' => $nextDepth,
    ]);
    $newTopicId = (int) $pdo->lastInsertId();

    $pdo->prepare(
        'INSERT INTO topic_relations (from_topic_id, to_topic_id, relation_type) VALUES (:from, :to, "deepen")'
    )->execute([':from' => $parent['id'], ':to' => $newTopicId]);

    $pdo->prepare(
        'INSERT INTO ai_generation_log (user_id, topic_id, parent_topic_id, model) VALUES (:user_id, :topic_id, :parent_id, :model)'
    )->execute([
        ':user_id' => $userId,
        ':topic_id' => $newTopicId,
        ':parent_id' => $parent['id'],
        ':model' => WADAI_AI_MODEL,
    ]);

    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
}

$newTopic = $pdo->prepare(wadai_topic_base_select() . ' WHERE t.id = :id');
$newTopic->execute([':id' => $newTopicId]);
$row = $newTopic->fetch();

wadai_json(wadai_topic_to_dto($pdo, $row), 201);
