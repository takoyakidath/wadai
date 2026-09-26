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
  source        ENUM('seed','user_submission') NOT NULL DEFAULT 'seed',
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
