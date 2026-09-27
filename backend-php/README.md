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

`.env.local` があればそちらが優先される（ローカルの MySQL root 接続用の値が入っている）。
`.env` は本番（ロリポップ）用の値を書いて、そのままFTPでアップロードする想定。

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
5. データ投入と管理者作成：
   - `seed.php` は冪等（`source='seed'` の話題だけ削除して入れ直す）なので、既に一度実行済みの本番DBに対して再実行しても二重化しない。ユーザー投稿・AI生成の話題には触れない。
   - **SSHがある場合**：`php seed.php` と `php cli/create_admin.php <username> <password>` をそのまま実行。
   - **SSHが無い場合（基本プラン）**：
     - シード投入は `schema.sql` と同様に phpMyAdmin から `seed.php` の中身相当を手動INSERTするか、`seed.php` を一時的にブラウザから直接開いて実行し、終わったら削除する。
     - 管理者作成は `.env` に `SETUP_TOKEN`（ランダムな文字列）を設定したうえで、ブラウザで
       `https://your-domain.example.com/api/setup/create-admin` を開くと簡単な入力フォームが表示されるので、
       SETUP_TOKEN・ユーザー名・パスワードを入力して送信する（`routes/setup_create_admin.php`）。
       トークンやパスワードをURLのクエリパラメータに載せるとロリポップのアクセスログに平文で残ってしまうため、
       あえてフォーム（POST）だけで受け付ける作りにしてある。**実行後は `.env` の `SETUP_TOKEN` を必ず空にする**（設定されている間は誰でもこのURLを知っていれば管理者を作成・上書きできてしまうため）。
6. ロリポップの「cron設定」で以下を日次登録：
   - `php /home/ユーザー名/公開フォルダ/api/cron/cleanup_rate_limit.php`
   - `php /home/ユーザー名/公開フォルダ/api/cron/retry_webhooks.php`
7. Vercel 側の環境変数 `NEXT_PUBLIC_API_BASE_URL` を `https://your-domain.example.com/api` に設定する。

## エンドポイント

`../ワダイ — 話題ガチャ 企画・仕様書.md` の §8 参照。実装は `routes/*.php`、ルーティングは `index.php`。
