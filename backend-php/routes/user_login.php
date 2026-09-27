<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/user_auth.php';

$pdo = wadai_db();
$input = wadai_read_json_body();
$username = trim((string) ($input['username'] ?? ''));
$password = (string) ($input['password'] ?? '');

if ($username === '' || $password === '') {
    wadai_error('invalid_credentials', 'ユーザー名とパスワードを入力してください。', 400);
}

$stmt = $pdo->prepare('SELECT id, password_hash FROM users WHERE username = :username');
$stmt->execute([':username' => $username]);
$user = $stmt->fetch();

if ($user === false || !password_verify($password, $user['password_hash'])) {
    usleep(300000);
    wadai_error('invalid_credentials', 'ユーザー名またはパスワードが違います。', 401);
}

$pdo->prepare('UPDATE users SET last_login_at = NOW() WHERE id = :id')->execute([':id' => $user['id']]);

$session = wadai_create_user_session($pdo, (int) $user['id']);
wadai_json($session);
