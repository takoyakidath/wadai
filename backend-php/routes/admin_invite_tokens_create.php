<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/auth.php';

$pdo = wadai_db();
$adminId = wadai_require_admin($pdo);

$input = wadai_read_json_body();
$expiresInDays = isset($input['expiresInDays']) && is_int($input['expiresInDays']) ? $input['expiresInDays'] : 30;

$token = bin2hex(random_bytes(12)); // 24文字
$expiresAt = $expiresInDays > 0 ? date('Y-m-d H:i:s', time() + $expiresInDays * 86400) : null;

$pdo->prepare(
    'INSERT INTO invite_tokens (token, created_by, expires_at) VALUES (:token, :created_by, :expires_at)'
)->execute([':token' => $token, ':created_by' => $adminId, ':expires_at' => $expiresAt]);

wadai_json(['token' => $token, 'expiresAt' => $expiresAt], 201);
