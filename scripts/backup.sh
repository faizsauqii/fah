#!/bin/sh
# Backup database SQLite JamHijau. Jalankan dari folder repo di STB.
# Cron harian (jam 02.00): 0 2 * * * cd /home/<user>/jamhijau && ./scripts/backup.sh >> backups/backup.log 2>&1
set -eu
STAMP=$(date +%Y%m%d-%H%M)
mkdir -p backups
for svc in auth core; do
  # VACUUM INTO membuat salinan yang konsisten walaupun service sedang berjalan.
  docker compose exec -T "$svc-service" node --no-warnings -e \
    "const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync('/data/$svc.db');d.exec(\"VACUUM INTO '/data/backup-tmp.db'\");"
  docker compose cp "$svc-service:/data/backup-tmp.db" "backups/$svc-$STAMP.db"
  docker compose exec -T "$svc-service" rm -f /data/backup-tmp.db
done
# Simpan 7 salinan terakhir per service
for svc in auth core; do
  ls -1t backups/$svc-*.db 2>/dev/null | tail -n +8 | xargs -r rm -f
done
echo "$(date) backup selesai: $STAMP"
