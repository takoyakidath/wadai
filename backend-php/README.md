# ワダイ API（ロリポップ / PHP）

Composer・フレームワーク不要の素のPHP 8。フロント（Next.js on Vercel）から `fetch` で叩く前提。

## ローカル開発

```bash
# 初回のみ：ローカルMySQLにスキーマとシードを投入
mysql -u root wadai_dev < schema.sql
php seed.php

# 初回のみ：管理者アカウントを作成
php cli/create_admin.php <username> <password>

# 開発サーバー起動（http://localhost:8080/... で叩ける）
php -S localhost:8080 -t .
```

`.env` はローカル用の値がすでに入っています（ローカルの MySQL root 接続）。

## 管理画面の認証について

フロント（Vercel）とAPI（ロリポップ）が別オリジンなので、企画書§9の想定（httpOnly Cookie）ではなく
**Bearer トークン方式**にしている。`POST /admin/login` が返すトークンをフロント側で `localStorage` に保存し、
以降のadmin系リクエストに `Authorization: Bearer <token>` を付与する（`src/lib/admin-api-client.ts`）。
有効期限は12時間（`admin_sessions.expires_at`）。

## ロリポップへのデプロイ手順

1. ロリポップの管理画面 →「データベース」で MySQL データベースを作成し、ホスト名・DB名・ユーザー名・パスワードを控える。
2. phpMyAdmin（ロリポップ管理画面から開ける）で `schema.sql` の中身を実行してテーブルを作成。
3. `.env.example` を `.env` としてコピーし、控えた接続情報と `CORS_ALLOWED_ORIGIN`（Vercel の本番URL）、`DISCORD_WEBHOOK_URL`、`SUBMISSION_IP_SALT`（ランダムな文字列）を埋める。
4. FTP（ロリポップFTPアカウント）でこの `backend-php/` フォルダの中身一式（`.env` を含む）を、公開フォルダ配下の `api/` に丸ごとアップロード。
   - 最終的な公開URLが `https://your-domain.example.com/api/...` になるように配置する。
5. 一度だけ `php seed.php` と `php cli/create_admin.php <username> <password>` をロリポップ上で実行する（ロリポップにSSHがあればそのまま、無ければ一時的にブラウザから直接開いて実行し、終わったら削除する）。
6. ロリポップの「cron設定」で以下を日次登録：
   - `php /home/ユーザー名/公開フォルダ/api/cron/cleanup_rate_limit.php`
   - `php /home/ユーザー名/公開フォルダ/api/cron/retry_webhooks.php`
7. Vercel 側の環境変数 `NEXT_PUBLIC_API_BASE_URL` を `https://your-domain.example.com/api` に設定する。

## エンドポイント

`../ワダイ — 話題ガチャ 企画・仕様書.md` の §8 参照。実装は `routes/*.php`、ルーティングは `index.php`。
