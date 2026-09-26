<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/auth.php';

$pdo = wadai_db();
wadai_require_admin($pdo);

if (!ctype_digit($submissionId)) {
    wadai_error('not_found', 'Not found', 404);
}

$input = wadai_read_json_body();
$reason = is_string($input['reason'] ?? null) ? trim($input['reason']) : '';

$stmt = $pdo->prepare(
    'UPDATE submissions SET status = "rejected", reject_reason = :reason, reviewed_at = NOW()
     WHERE id = :id AND status = "pending"'
);
$stmt->execute([':reason' => $reason !== '' ? $reason : null, ':id' => $submissionId]);

if ($stmt->rowCount() === 0) {
    wadai_error('not_found', '申請が見つからないか、すでに処理済みです。', 404);
}

wadai_json(['id' => $submissionId, 'status' => 'rejected']);
