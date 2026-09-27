-- ロリポップ MySQL 8 用スキーマ（企画書 §7 のDDLをベースに、Redisが使えない分の
-- レート制限テーブルを追加）。phpMyAdmin から流し込むか、CLI で `mysql db < schema.sql`。

CREATE TABLE IF NOT EXISTS categories (
  id          TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `key`       VARCHAR(30) NOT NULL,
  label       VARCHAR(50) NOT NULL,
  sort_order  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_categories_key (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS topics (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  body          VARCHAR(200) NOT NULL,
  category_id   TINYINT UNSIGNED NULL,
  depth         TINYINT UNSIGNED NOT NULL DEFAULT 1,
  is_starter    BOOLEAN NOT NULL DEFAULT FALSE,
  status        ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  source        ENUM('seed','user_submission','ai_generated') NOT NULL DEFAULT 'seed',
  submission_id BIGINT UNSIGNED NULL,
  draw_count    INT UNSIGNED NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_topics_depth CHECK (depth BETWEEN 1 AND 4),
  CONSTRAINT fk_topics_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  INDEX idx_topics_gacha (status, is_starter, category_id),
  INDEX idx_topics_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS topic_relations (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  from_topic_id  BIGINT UNSIGNED NOT NULL,
  to_topic_id    BIGINT UNSIGNED NOT NULL,
  relation_type  ENUM('deepen','related') NOT NULL,
  display_order  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_relations_no_self CHECK (from_topic_id <> to_topic_id),
  CONSTRAINT fk_rel_from FOREIGN KEY (from_topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  CONSTRAINT fk_rel_to   FOREIGN KEY (to_topic_id)   REFERENCES topics(id) ON DELETE CASCADE,
  UNIQUE KEY uq_relation (from_topic_id, to_topic_id, relation_type),
  INDEX idx_rel_from (from_topic_id, relation_type, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS submissions (
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  body                  VARCHAR(200) NOT NULL,
  category_id           TINYINT UNSIGNED NULL,
  suggested_depth       TINYINT UNSIGNED NULL,
  status                ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  flagged               BOOLEAN NOT NULL DEFAULT FALSE,
  flag_reasons          VARCHAR(255) NOT NULL DEFAULT '',
  submitter_ip_hash     CHAR(64) NULL,
  reviewed_by           VARCHAR(100) NULL,
  reviewed_at           DATETIME NULL,
  reject_reason         VARCHAR(200) NULL,
  resulting_topic_id    BIGINT UNSIGNED NULL,
  webhook_notified_at   DATETIME NULL,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sub_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_sub_topic    FOREIGN KEY (resulting_topic_id) REFERENCES topics(id) ON DELETE SET NULL,
  INDEX idx_sub_status (status, created_at),
  INDEX idx_sub_ip_hash (submitter_ip_hash, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS admins (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME NULL,
  UNIQUE KEY uq_admins_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- フロント（Vercel）とAPI（ロリポップ）が別オリジンのため、Cookieセッションではなく
-- Bearer トークン方式にしている（§9の想定から実装都合で変更）。
CREATE TABLE IF NOT EXISTS admin_sessions (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id    INT UNSIGNED NOT NULL,
  token       CHAR(64) NOT NULL,
  expires_at  DATETIME NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_session_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
  UNIQUE KEY uq_session_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Redis が使えないため、レート制限は MySQL の小テーブルで代用（§16）。
-- 対象は申請APIのみ。古い行は日次cronで削除する（cron/cleanup_rate_limit.php）。
CREATE TABLE IF NOT EXISTS rate_limit_hits (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  bucket      VARCHAR(40) NOT NULL,
  ip_hash     CHAR(64) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rate_limit_lookup (bucket, ip_hash, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ここから: AIでの話題生成（招待制）。有料APIを叩く機能なので、招待トークンを持つ
-- ユーザー登録者だけが使える。管理者アカウント（admins）とは別の、一般ユーザー向けの
-- 最小限のアカウント。認証方式は admin_sessions と同じ Bearer トークン。
CREATE TABLE IF NOT EXISTS users (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username          VARCHAR(50) NOT NULL,
  password_hash     VARCHAR(255) NOT NULL,
  invited_by_token  VARCHAR(32) NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at     DATETIME NULL,
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_sessions (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT UNSIGNED NOT NULL,
  token       CHAR(64) NOT NULL,
  expires_at  DATETIME NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_session_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- AI生成の監査ログ兼レート制限用（1ユーザー1日あたりの生成回数の上限に使う）
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- いいね（マイカード）。招待制ユーザーだけが使える（AI機能と同じ users を流用）。
CREATE TABLE IF NOT EXISTS topic_likes (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT UNSIGNED NOT NULL,
  topic_id    BIGINT UNSIGNED NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_like_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  CONSTRAINT fk_like_topic FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  UNIQUE KEY uq_like (user_id, topic_id),
  INDEX idx_likes_user (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
