# ワダイ｜話題ガチャ

話題に困ったら、1回まわす。会話を続けるための話題ガチャアプリ。

企画・仕様書: `ワダイ — 話題ガチャ 企画・仕様書.md`

## 構成

- フロント: この Next.js（App Router）アプリ。Vercel にデプロイ
- API・DB: `backend-php/`（素のPHP 8 + MySQL）。ロリポップにデプロイ
- フロントとAPIは別オリジンなので、通信は `NEXT_PUBLIC_API_BASE_URL` 経由の絶対URLで行う（相対パスの `/api/...` ではない）

## ローカル開発

```bash
# 1. PHP側（別ターミナル） — backend-php/README.md も参照
cd backend-php
mysql -u root wadai_dev < schema.sql   # 初回のみ
php seed.php                            # 初回のみ
php cli/create_admin.php <username> <password>  # 初回のみ
php -S localhost:8080 -t .

# 2. フロント側
npm install
npm run dev
```

`.env.local` の `NEXT_PUBLIC_API_BASE_URL` はデフォルトで `http://localhost:8080` を指す。

## PWA / オフライン対応

- `public/sw.js`: 同一オリジンのリクエストをネットワーク優先＋キャッシュフォールバックで保持する Service Worker
- `public/offline-topics.json`: API に届かない時にクライアント側（`src/lib/offline-topics.ts`）が使う話題グラフのスナップショット
  - **id はロリポップ本番DBの初期シード（`backend-php/seed.php`）の連番と完全一致させてある**（1〜23）。こうしておくと、オンライン中に引いた話題のまま回線が落ちても「深める／広げる」を継続できる
  - シードを作り直して連番がズレた場合、または管理画面から新しい話題を採用した場合（id 24以降）は、その話題についてはオフライン時に深堀りできない（オフライン用スナップショットに無いため）。これは仕様上の制約で、実データを丸ごと静的ファイル化しない限り避けられない

## 管理画面

`/admin`（要ログイン）。認証方式や運用手順は `backend-php/README.md` を参照。
