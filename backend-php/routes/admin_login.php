<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/auth.php';

$pdo = wadai_db();
$input = wadai_read_json_body();
$username = is_string($input['username'] ?? null) ? trim($input['username']) : '';
$password = is_string($input['password'] ?? null) ? $input['password'] : '';

if ($username === '' || $password === '') {
    wadai_error('invalid_credentials', 'ユーザー名とパスワードを入力してください。', 400);
}

$stmt = $pdo->prepare('SELECT id, password_hash FROM admins WHERE username = :username');
$stmt->execute([':username' => $username]);
$admin = $stmt->fetch();

if ($admin === false || !password_verify($password, $admin['password_hash'])) {
    // ログイン試行の総当たりを遅くする（厳密なレート制限は別途 rate_limit_hits でも可）
    usleep(300000);
    wadai_error('invalid_credentials', 'ユーザー名またはパスワードが違います。', 401);
}

$pdo->prepare('UPDATE admins SET last_login_at = NOW() WHERE id = :id')->execute([':id' => $admin['id']]);

$session = wadai_create_session($pdo, (int) $admin['id']);

wadai_json($session);
