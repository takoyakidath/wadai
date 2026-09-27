<?php
declare(strict_types=1);

// SSHが無いロリポップの基本プラン向けの一回限りのスキーマ移行。
// .env に SETUP_TOKEN を設定した場合のみ有効になる（create-admin と同じ仕組み・同じトークンを使う）。
// GETは常にフォームを返すだけ（トークンをURLに載せない）。実行はPOSTのみ。
// 何度実行しても安全（CREATE TABLE IF NOT EXISTS / 同じ値へのMODIFYは冪等）。

$setupToken = wadai_env('SETUP_TOKEN', '');
if ($setupToken === '') {
    wadai_error('not_found', 'Not found', 404);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Content-Type: text/html; charset=utf-8');
    echo <<<HTML
<!doctype html>
<meta charset="utf-8">
<title>スキーマ移行</title>
<style>body{font-family:sans-serif;max-width:360px;margin:40px auto;padding:0 16px}
input{display:block;width:100%;box-sizing:border-box;padding:8px;margin:6px 0 14px;font-size:16px}
button{padding:10px 16px;font-size:16px}</style>
<h1>スキーマ移行（AI機能・いいね機能用テーブル追加）</h1>
<p>users / invite_tokens / user_sessions / ai_generation_log / topic_likes を作成し、topics.source に ai_generated を追加します。何度実行しても安全です。</p>
<form method="post">
  <label>SETUP_TOKEN<input type="password" name="token" required></label>
  <button type="submit">実行する</button>
</form>
HTML;
    exit;
}

$providedToken = (string) ($_POST['token'] ?? '');
if (!hash_equals($setupToken, $providedToken)) {
    wadai_error('unauthorized', 'トークンが違います。', 401);
}

$pdo = wadai_db();
$log = [];

$statements = [
    'topics.source に ai_generated を追加' =>
        "ALTER TABLE topics MODIFY source ENUM('seed','user_submission','ai_generated') NOT NULL DEFAULT 'seed'",
    'users テーブル' => "
        CREATE TABLE IF NOT EXISTS users (
          id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          username          VARCHAR(50) NOT NULL,
          password_hash     VARCHAR(255) NOT NULL,
          invited_by_token  VARCHAR(32) NULL,
          created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          last_login_at     DATETIME NULL,
          UNIQUE KEY uq_users_username (username)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
    'invite_tokens テーブル' => "
        CREATE TABLE IF NOT EXISTS invite_tokens (
          id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          token       VARCHAR(32) NOT NULL,
          created_by  INT UNSIGNED NULL,
          used_by     BIGINT UNSIGNED NULL,
          used_at     DATETIME NULL,
          expires_at  DATETIME NULL,
          created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_invite_created_by FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL,
          CONSTRAINT fk_invite_used_by FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL,
          UNIQUE KEY uq_invite_token (token)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
    'user_sessions テーブル' => "
        CREATE TABLE IF NOT EXISTS user_sessions (
          id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          user_id     BIGINT UNSIGNED NOT NULL,
          token       CHAR(64) NOT NULL,
          expires_at  DATETIME NOT NULL,
          created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_user_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY uq_user_session_token (token)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
    'ai_generation_log テーブル' => "
        CREATE TABLE IF NOT EXISTS ai_generation_log (
          id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          user_id     BIGINT UNSIGNED NOT NULL,
          topic_id    BIGINT UNSIGNED NULL,
          parent_topic_id BIGINT UNSIGNED NOT NULL,
          model       VARCHAR(50) NOT NULL,
          created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_ai_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT fk_ai_log_topic FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL,
          INDEX idx_ai_log_user_date (user_id, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
    'topic_likes テーブル' => "
        CREATE TABLE IF NOT EXISTS topic_likes (
          id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          user_id     BIGINT UNSIGNED NOT NULL,
          topic_id    BIGINT UNSIGNED NOT NULL,
          created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_like_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
          CONSTRAINT fk_like_topic FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
          UNIQUE KEY uq_like (user_id, topic_id),
          INDEX idx_likes_user (user_id, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
];

foreach ($statements as $label => $sql) {
    try {
        $pdo->exec($sql);
        $log[] = "OK: {$label}";
    } catch (Throwable $e) {
        $log[] = "FAILED: {$label} — " . $e->getMessage();
    }
}

wadai_json(['log' => $log]);
