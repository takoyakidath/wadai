<?php
declare(strict_types=1);

// 使い方: php cli/create_admin.php <username> <password>
// ロリポップにSSHが無ければ、このファイルを一時的にブラウザから直接開いて実行し、終わったら削除する
// （その場合は下のCLI引数チェックを外し、$_GET['username']/$_GET['password']に読み替える）。

require_once __DIR__ . '/../config.php';

$username = $argv[1] ?? null;
$password = $argv[2] ?? null;

if ($username === null || $password === null) {
    fwrite(STDERR, "使い方: php cli/create_admin.php <username> <password>\n");
    exit(1);
}

if (strlen($password) < 8) {
    fwrite(STDERR, "パスワードは8文字以上にしてください。\n");
    exit(1);
}

$pdo = wadai_db();
$hash = password_hash($password, PASSWORD_DEFAULT);

$stmt = $pdo->prepare(
    'INSERT INTO admins (username, password_hash) VALUES (:username, :hash)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)'
);
$stmt->execute([':username' => $username, ':hash' => $hash]);

echo "管理者 '{$username}' を作成（または更新）しました。\n";
