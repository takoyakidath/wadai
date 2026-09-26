#!/bin/sh
# ロリポップ(FTP/FTPS)へ backend-php をアップロードするだけのスクリプト。
# 使い方:
#   cp .env.deploy.example .env.deploy   # 値を埋める(このファイルはgit管理外)
#   ./deploy.sh              # 全ファイルをアップロード
#   ./deploy.sh --dry-run    # アップロードせず対象ファイル一覧だけ表示
#   ./deploy.sh index.php lib/env.php   # 指定ファイルだけアップロード
set -eu

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
cd "$SCRIPT_DIR"

ENV_FILE=".env.deploy"
if [ ! -f "$ENV_FILE" ]; then
  echo "設定ファイルがありません: $ENV_FILE" >&2
  echo "cp .env.deploy.example .env.deploy を実行して値を埋めてください" >&2
  exit 1
fi

set -a
# shellcheck source=/dev/null
. "./$ENV_FILE"
set +a

: "${FTP_HOST:?FTP_HOST が未設定です (.env.deploy)}"
: "${FTP_USER:?FTP_USER が未設定です (.env.deploy)}"
: "${FTP_PASS:?FTP_PASS が未設定です (.env.deploy)}"
FTP_PORT="${FTP_PORT:-21}"
FTP_REMOTE_DIR="${FTP_REMOTE_DIR:-/}"
FTP_SSL="${FTP_SSL:-1}"

DRY_RUN=0
FILES=""
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    *) FILES="$FILES $arg" ;;
  esac
done

# サーバーに送らないもの
EXCLUDE_PATTERNS='
./.git/*
./.env
./.env.*
./deploy.sh
./README.md
./.DS_Store
'

is_excluded() {
  target="$1"
  for pattern in $EXCLUDE_PATTERNS; do
    case "$target" in
      $pattern) return 0 ;;
    esac
  done
  return 1
}

CURL_OPTS="-sS --ftp-create-dirs -u ${FTP_USER}:${FTP_PASS}"
if [ "$FTP_SSL" = "1" ]; then
  CURL_OPTS="$CURL_OPTS --ssl-reqd"
fi

upload_one() {
  file="$1"
  remote_path="${FTP_REMOTE_DIR%/}/${file#./}"
  if [ "$DRY_RUN" = "1" ]; then
    echo "DRY-RUN: $file -> ftp://${FTP_HOST}:${FTP_PORT}${remote_path}"
    return 0
  fi
  echo "UP: $file -> $remote_path"
  curl $CURL_OPTS -T "$file" "ftp://${FTP_HOST}:${FTP_PORT}${remote_path}"
}

if [ -n "$FILES" ]; then
  for file in $FILES; do
    case "$file" in
      /*) rel="./${file#/}" ;;
      *) rel="./$file" ;;
    esac
    if [ ! -f "$rel" ]; then
      echo "見つかりません: $file" >&2
      exit 1
    fi
    upload_one "$rel"
  done
else
  find . -type f | while IFS= read -r file; do
    if is_excluded "$file"; then
      continue
    fi
    upload_one "$file"
  done
fi

echo "完了"
