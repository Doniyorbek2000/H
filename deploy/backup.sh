#!/usr/bin/env bash
# Smart Murojaat AI — PostgreSQL + yuklangan fayllar zaxira nusxasi.
# Cron misoli (har kuni soat 02:00):
#   0 2 * * * /opt/smart-murojaat/deploy/backup.sh >> /var/log/sm-backup.log 2>&1
set -euo pipefail

# ==== Sozlamalar (environmentdan yoki shu yerda) ====
BACKUP_DIR="${BACKUP_DIR:-/var/backups/smart-murojaat}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
# Docker compose ishlatilsa: postgres konteyner nomi
PG_CONTAINER="${PG_CONTAINER:-smart-murojaat-postgres-1}"
PG_USER="${POSTGRES_USER:-postgres}"
PG_DB="${POSTGRES_DB:-smart_murojaat}"
UPLOADS_VOLUME="${UPLOADS_VOLUME:-smart-murojaat_uploads}"

STAMP="$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Backup boshlandi -> $BACKUP_DIR"

# 1) Ma'lumotlar bazasi (custom format, siqilgan)
if docker ps --format '{{.Names}}' | grep -q "$PG_CONTAINER"; then
  docker exec "$PG_CONTAINER" pg_dump -U "$PG_USER" -F c "$PG_DB" \
    > "$BACKUP_DIR/db_${STAMP}.dump"
else
  # Docker'siz (lokal postgres) holat
  pg_dump -U "$PG_USER" -F c "$PG_DB" > "$BACKUP_DIR/db_${STAMP}.dump"
fi
echo "  ✓ DB: db_${STAMP}.dump"

# 2) Yuklangan fayllar (lokal storage). S3/MinIO ishlatilsa bu qadam shart emas.
if docker volume ls --format '{{.Name}}' | grep -q "$UPLOADS_VOLUME"; then
  docker run --rm -v "${UPLOADS_VOLUME}:/data:ro" -v "$BACKUP_DIR:/backup" alpine \
    tar czf "/backup/uploads_${STAMP}.tar.gz" -C /data .
  echo "  ✓ Fayllar: uploads_${STAMP}.tar.gz"
fi

# 3) Eski nusxalarni tozalash
find "$BACKUP_DIR" -name 'db_*.dump' -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name 'uploads_*.tar.gz' -mtime +"$RETENTION_DAYS" -delete
echo "[$(date)] Backup yakunlandi. Saqlash muddati: ${RETENTION_DAYS} kun"

# Tiklash (misol):
#   docker exec -i $PG_CONTAINER pg_restore -U postgres -d smart_murojaat --clean < db_YYYYMMDD.dump
