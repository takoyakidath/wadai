<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/auth.php';

$pdo = wadai_db();
$adminId = wadai_require_admin($pdo);

$input = wadai_read_json_body();
$expiresInDays = isset($input['expiresInDays']) && is_int($input['expiresInDays']) ? $input['expiresInDays'] : 30;

$token = bin2hex(random_bytes(12)); // 24文字

// expires_at はMySQL側のNOW()で計算する（PHP/MySQLのタイムゾーン差を避けるため）。
if ($expiresInDays > 0) {
    $pdo->prepare(
        'INSERT INTO invite_tokens (token, created_by, expires_at) VALUES (:token, :created_by, NOW() + INTERVAL :days DAY)'
    )->execute([':token' => $token, ':created_by' => $adminId, ':days' => $expiresInDays]);
} else {
    $pdo->prepare(
        'INSERT INTO invite_tokens (token, created_by, expires_at) VALUES (:token, :created_by, NULL)'
    )->execute([':token' => $token, ':created_by' => $adminId]);
}

$expiresAt = $pdo->prepare('SELECT expires_at FROM invite_tokens WHERE token = :token');
$expiresAt->execute([':token' => $token]);

wadai_json(['token' => $token, 'expiresAt' => $expiresAt->fetchColumn()], 201);
