<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/user_auth.php';

$pdo = wadai_db();
$input = wadai_read_json_body();

$inviteToken = trim((string) ($input['inviteToken'] ?? ''));
$username = trim((string) ($input['username'] ?? ''));
$password = (string) ($input['password'] ?? '');

if ($inviteToken === '' || $username === '' || strlen($password) < 8) {
    wadai_error('invalid_input', '招待コード・ユーザー名・8文字以上のパスワードを入力してください。', 400);
}

$pdo->beginTransaction();
try {
    $tokenStmt = $pdo->prepare(
        'SELECT id FROM invite_tokens
         WHERE token = :token AND used_by IS NULL AND (expires_at IS NULL OR expires_at > NOW())
         FOR UPDATE'
    );
    $tokenStmt->execute([':token' => $inviteToken]);
    $tokenRow = $tokenStmt->fetch();

    if ($tokenRow === false) {
        $pdo->rollBack();
        wadai_error('invalid_invite', '招待コードが無効か、すでに使われています。', 400);
    }

    $existing = $pdo->prepare('SELECT id FROM users WHERE username = :username');
    $existing->execute([':username' => $username]);
    if ($existing->fetch() !== false) {
        $pdo->rollBack();
        wadai_error('username_taken', 'そのユーザー名はすでに使われています。', 409);
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $insertUser = $pdo->prepare(
        'INSERT INTO users (username, password_hash, invited_by_token) VALUES (:username, :hash, :token)'
    );
    $insertUser->execute([':username' => $username, ':hash' => $hash, ':token' => $inviteToken]);
    $userId = (int) $pdo->lastInsertId();

    $pdo->prepare('UPDATE invite_tokens SET used_by = :user_id, used_at = NOW() WHERE id = :id')
        ->execute([':user_id' => $userId, ':id' => $tokenRow['id']]);

    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
}

$session = wadai_create_user_session($pdo, $userId);
wadai_json($session, 201);
