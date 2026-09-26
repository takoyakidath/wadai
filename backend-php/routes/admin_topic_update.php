<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/auth.php';

$pdo = wadai_db();
wadai_require_admin($pdo);

if (!ctype_digit($topicId)) {
    wadai_error('not_found', 'Not found', 404);
}

$input = wadai_read_json_body();
$fields = [];
$params = [':id' => $topicId];

if (isset($input['body']) && is_string($input['body'])) {
    $body = trim($input['body']);
    if ($body === '' || mb_strlen($body) > 200) {
        wadai_error('invalid_body', '本文を確認してください（200文字以内）。', 400);
    }
    $fields[] = 'body = :body';
    $params[':body'] = $body;
}

if (isset($input['depth']) && is_int($input['depth'])) {
    if ($input['depth'] < 1 || $input['depth'] > 4) {
        wadai_error('invalid_depth', '深度は1〜4で指定してください。', 400);
    }
    $fields[] = 'depth = :depth';
    $params[':depth'] = $input['depth'];
}

if (array_key_exists('categoryKey', $input)) {
    $categoryId = null;
    if (is_string($input['categoryKey']) && $input['categoryKey'] !== '') {
        $catStmt = $pdo->prepare('SELECT id FROM categories WHERE `key` = :key');
        $catStmt->execute([':key' => $input['categoryKey']]);
        $category = $catStmt->fetch();
        $categoryId = $category !== false ? (int) $category['id'] : null;
    }
    $fields[] = 'category_id = :category_id';
    $params[':category_id'] = $categoryId;
}

if (isset($input['isStarter'])) {
    $fields[] = 'is_starter = :is_starter';
    $params[':is_starter'] = !empty($input['isStarter']) ? 1 : 0;
}

if (isset($input['status']) && in_array($input['status'], ['draft', 'published', 'archived'], true)) {
    $fields[] = 'status = :status';
    $params[':status'] = $input['status'];
}

if ($fields === []) {
    wadai_error('no_fields', '更新する項目がありません。', 400);
}

$sql = 'UPDATE topics SET ' . implode(', ', $fields) . ' WHERE id = :id';
$stmt = $pdo->prepare($sql);
$stmt->execute($params);

wadai_json(['id' => $topicId, 'updated' => true]);
