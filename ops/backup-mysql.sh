#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

: "${BACKUP_AGE_RECIPIENT:?Set BACKUP_AGE_RECIPIENT to the age public recipient}"
: "${BACKUP_RCLONE_DEST:?Set BACKUP_RCLONE_DEST to a configured off-site rclone path}"

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
if [[ ! "$RETENTION_DAYS" =~ ^[1-9][0-9]*$ ]]; then
  printf '%s\n' 'BACKUP_RETENTION_DAYS must be a positive integer.' >&2
  exit 2
fi

for command_name in docker age rclone gzip; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf 'Required command not found: %s\n' "$command_name" >&2
    exit 127
  fi
done

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
backup_dir="${BACKUP_DIR:-/var/backups/keystock}"
install -d -m 700 "$backup_dir"
work_dir="$(mktemp -d "$backup_dir/.backup.XXXXXX")"
trap 'rm -rf -- "$work_dir"' EXIT

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
base_name="keystock-${stamp}.sql.gz.age"
plain_dump="$work_dir/${base_name%.age}"
encrypted_dump="$work_dir/$base_name"

cd "$repo_dir"
docker compose exec -T mysql sh -ec '
  umask 077
  credentials="$(mktemp)"
  trap '\''rm -f -- "$credentials"'\'' EXIT
  printf "[client]\nuser=%s\npassword=%s\n" "$MYSQL_USER" "$MYSQL_PASSWORD" > "$credentials"
  mysqldump --defaults-extra-file="$credentials" --single-transaction --quick --routines --triggers --events --hex-blob --set-gtid-purged=OFF --databases "$MYSQL_DATABASE"
' | gzip -c > "$plain_dump"

if [[ ! -s "$plain_dump" ]]; then
  printf '%s\n' 'Database dump is empty; refusing to publish a backup.' >&2
  exit 1
fi

age --recipient "$BACKUP_AGE_RECIPIENT" --output "$encrypted_dump" "$plain_dump"
rclone copyto "$encrypted_dump" "${BACKUP_RCLONE_DEST%/}/$base_name"
install -m 600 "$encrypted_dump" "$backup_dir/$base_name"
find "$backup_dir" -maxdepth 1 -type f -name 'keystock-*.sql.gz.age' -mtime "+$RETENTION_DAYS" -delete

printf 'Encrypted backup stored locally and copied off-site: %s\n' "$base_name"
