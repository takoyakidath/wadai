<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/auth.php';

$pdo = wadai_db();
wadai_require_admin($pdo);

if (!ctype_digit($submissionId)) {
    wadai_error('not_found', 'Not found', 404);
}

$sub = $pdo->prepare('SELECT id FROM submissions WHERE id = :id AND status = "pending"');
$sub->execute([':id' => $submissionId]);
if ($sub->fetch() === false) {
    wadai_error('not_found', '申請が見つからないか、すでに処理済みです。', 404);
}

$input = wadai_read_json_body();
$body = is_string($input['body'] ?? null) ? trim($input['body']) : '';
$categoryKey = is_string($input['categoryKey'] ?? null) ? $input['categoryKey'] : null;
$depth = is_int($input['depth'] ?? null) ? $input['depth'] : 1;
$isStarter = !empty($input['isStarter']);
$deepenParentId = isset($input['deepenParentId']) && ctype_digit((string) $input['deepenParentId'])
    ? (string) $input['deepenParentId']
    : null;
$relatedTopicIds = is_array($input['relatedTopicIds'] ?? null)
    ? array_values(array_filter($input['relatedTopicIds'], fn($id) => ctype_digit((string) $id)))
    : [];

if ($body === '' || mb_strlen($body) > 200) {
    wadai_error('invalid_body', '本文を確認してください（200文字以内）。', 400);
}
if ($depth < 1 || $depth > 4) {
    wadai_error('invalid_depth', '深度は1〜4で指定してください。', 400);
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
        'INSERT INTO topics (body, category_id, depth, is_starter, status, source, submission_id)
         VALUES (:body, :category_id, :depth, :is_starter, "published", "user_submission", :submission_id)'
    );
    $insertTopic->execute([
        ':body' => $body,
        ':category_id' => $categoryId,
        ':depth' => $depth,
        ':is_starter' => $isStarter ? 1 : 0,
        ':submission_id' => $submissionId,
    ]);
    $topicId = (int) $pdo->lastInsertId();

    if ($deepenParentId !== null) {
        $pdo->prepare(
            'INSERT IGNORE INTO topic_relations (from_topic_id, to_topic_id, relation_type) VALUES (:from, :to, "deepen")'
        )->execute([':from' => $deepenParentId, ':to' => $topicId]);
    }

    $relStmt = $pdo->prepare(
        'INSERT IGNORE INTO topic_relations (from_topic_id, to_topic_id, relation_type) VALUES (:a, :b, "related")'
    );
    foreach ($relatedTopicIds as $relatedId) {
        $relStmt->execute([':a' => $topicId, ':b' => $relatedId]);
        $relStmt->execute([':a' => $relatedId, ':b' => $topicId]);
    }

    $pdo->prepare(
        'UPDATE submissions SET status = "approved", resulting_topic_id = :topic_id, reviewed_at = NOW() WHERE id = :id'
    )->execute([':topic_id' => $topicId, ':id' => $submissionId]);

    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
}

wadai_json([
    'submission' => ['id' => $submissionId, 'status' => 'approved'],
    'topic' => ['id' => (string) $topicId, 'status' => 'published'],
]);
