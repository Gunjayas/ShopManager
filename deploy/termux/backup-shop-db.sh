#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

APP_DIR="$HOME/ShopManager"
DATABASE_SETTING="${DATABASE_PATH:-shop.db}"
RCLONE_DESTINATION="${RCLONE_DESTINATION:-gdrive:ShopManager/backups}"
BACKUP_TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"
TEMPORARY_DIRECTORY="$(mktemp -d)"
SNAPSHOT_PATH="$TEMPORARY_DIRECTORY/shop.db"

# Always removes the local temporary snapshot, including after an upload failure.
trap 'rm -rf "$TEMPORARY_DIRECTORY"' EXIT

if [[ "$DATABASE_SETTING" = /* ]]; then
  DATABASE_FILE="$DATABASE_SETTING"
else
  DATABASE_FILE="$APP_DIR/$DATABASE_SETTING"
fi

mkdir -p "$APP_DIR/logs"
exec >> "$APP_DIR/logs/backup.log" 2>&1
echo "[$(date --iso-8601=seconds)] Starting SQLite backup."

if [[ ! -f "$DATABASE_FILE" ]]; then
  echo "Database not found at $DATABASE_FILE." >&2
  exit 1
fi

# SQLite's online backup command includes committed WAL data in one consistent shop.db snapshot.
sqlite3 "$DATABASE_FILE" ".timeout 10000" ".backup '$SNAPSHOT_PATH'"

INTEGRITY_RESULT="$(sqlite3 "$SNAPSHOT_PATH" "PRAGMA integrity_check;")"
if [[ "$INTEGRITY_RESULT" != "ok" ]]; then
  echo "Backup integrity check failed: $INTEGRITY_RESULT" >&2
  exit 1
fi

rclone copyto \
  "$SNAPSHOT_PATH" \
  "$RCLONE_DESTINATION/$BACKUP_TIMESTAMP/shop.db" \
  --transfers 1 \
  --checkers 1

echo "[$(date --iso-8601=seconds)] Backup uploaded to $RCLONE_DESTINATION/$BACKUP_TIMESTAMP/shop.db."