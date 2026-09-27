<?php
declare(strict_types=1);

// SSHが無いロリポップの基本プラン向けの一回限りのブートストラップ。
// .env に SETUP_TOKEN を設定した場合のみ有効になる（未設定なら常に404）。
//
// GETでこのURLを開くと入力フォームが表示される（token/username/passwordはURLに載せない —
// クエリパラメータにするとロリポップのアクセスログに平文で残ってしまうため、POSTのみで受け付ける）。
// 使い終わったら .env の SETUP_TOKEN を空にするか削除しておくこと。

$setupToken = wadai_env('SETUP_TOKEN', '');
if ($setupToken === '') {
    wadai_error('not_found', 'Not found', 404);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Content-Type: text/html; charset=utf-8');
    echo <<<HTML
<!doctype html>
<meta charset="utf-8">
<title>管理者アカウント作成</title>
<style>body{font-family:sans-serif;max-width:360px;margin:40px auto;padding:0 16px}
input{display:block;width:100%;box-sizing:border-box;padding:8px;margin:6px 0 14px;font-size:16px}
button{padding:10px 16px;font-size:16px}</style>
<h1>管理者アカウント作成</h1>
<form method="post">
  <label>SETUP_TOKEN<input type="password" name="token" required></label>
  <label>ユーザー名<input type="text" name="username" required></label>
  <label>パスワード（8文字以上）<input type="password" name="password" minlength="8" required></label>
  <button type="submit">作成する</button>
</form>
HTML;
    exit;
}

$providedToken = (string) ($_POST['token'] ?? '');
if (!hash_equals($setupToken, $providedToken)) {
    wadai_error('unauthorized', 'トークンが違います。', 401);
}

$username = trim((string) ($_POST['username'] ?? ''));
$password = (string) ($_POST['password'] ?? '');

if ($username === '' || strlen($password) < 8) {
    wadai_error('invalid_input', 'username と、8文字以上の password を指定してください。', 400);
}

$pdo = wadai_db();
$hash = password_hash($password, PASSWORD_DEFAULT);

$stmt = $pdo->prepare(
    'INSERT INTO admins (username, password_hash) VALUES (:username, :hash)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)'
);
$stmt->execute([':username' => $username, ':hash' => $hash]);

wadai_json([
    'ok' => true,
    'message' => "管理者 '{$username}' を作成（または更新）しました。SETUP_TOKEN は使い終わったので .env から削除してください。",
]);
