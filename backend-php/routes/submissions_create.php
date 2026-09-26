<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/ip_hash.php';
require_once __DIR__ . '/../lib/rate_limit.php';
require_once __DIR__ . '/../lib/moderation.php';
require_once __DIR__ . '/../lib/discord.php';

$pdo = wadai_db();

$ip = wadai_client_ip();
$ipHash = wadai_hash_ip($ip);

// 1分間に40回、5分間に3回まで（§16）
if (!wadai_check_rate_limit($pdo, 'submissions_short', $ipHash, 3, 300)) {
    wadai_error('rate_limited', 'しばらく待ってからもう一度お試しください。', 429);
}

$input = wadai_read_json_body();
$body = is_string($input['body'] ?? null) ? trim($input['body']) : '';
$categoryKey = is_string($input['categoryKey'] ?? null) ? trim($input['categoryKey']) : null;

if ($body === '' || mb_strlen($body) > 200) {
    wadai_error('invalid_body', '話題の内容を確認してください（200文字以内）。', 400);
}

// 直近5分以内の同一IP・同一本文の重複投稿を防ぐ
$dupStmt = $pdo->prepare(
    'SELECT id FROM submissions WHERE submitter_ip_hash = :ip_hash AND body = :body AND created_at >= :since LIMIT 1'
);
$dupStmt->execute([
    ':ip_hash' => $ipHash,
    ':body' => $body,
    ':since' => date('Y-m-d H:i:s', time() - 300),
]);
if ($dupStmt->fetch() !== false) {
    wadai_error('duplicate_submission', '同じ内容が最近送信されています。', 409);
}

$categoryId = null;
$categoryLabel = '';
if ($categoryKey !== null && $categoryKey !== '') {
    $catStmt = $pdo->prepare('SELECT id, label FROM categories WHERE `key` = :key');
    $catStmt->execute([':key' => $categoryKey]);
    $category = $catStmt->fetch();
    if ($category !== false) {
        $categoryId = (int) $category['id'];
        $categoryLabel = $category['label'];
    }
}

$flagReasons = wadai_flag_submission($body);
$flagged = $flagReasons !== [];

$insert = $pdo->prepare(
    'INSERT INTO submissions (body, category_id, flagged, flag_reasons, submitter_ip_hash)
     VALUES (:body, :category_id, :flagged, :flag_reasons, :ip_hash)'
);
$insert->execute([
    ':body' => $body,
    ':category_id' => $categoryId,
    ':flagged' => $flagged ? 1 : 0,
    ':flag_reasons' => implode(',', $flagReasons),
    ':ip_hash' => $ipHash,
]);
$submissionId = (string) $pdo->lastInsertId();

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$adminBase = wadai_env('ADMIN_BASE_URL', "{$scheme}://{$_SERVER['HTTP_HOST']}/admin");
$adminUrl = rtrim($adminBase, '/') . "/submissions/{$submissionId}";
$createdAtJst = (new DateTimeImmutable('now', new DateTimeZone('Asia/Tokyo')))->format('Y-m-d H:i');

$notified = wadai_notify_discord_new_submission(
    $submissionId,
    $body,
    $categoryLabel,
    $createdAtJst,
    $adminUrl,
    $flagged
);

if ($notified) {
    $pdo->prepare('UPDATE submissions SET webhook_notified_at = NOW() WHERE id = :id')
        ->execute([':id' => $submissionId]);
}

wadai_json([
    'id' => $submissionId,
    'status' => 'pending',
    'message' => 'ご提案ありがとうございます。審査後に公開されます。',
], 201);
