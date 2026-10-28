#!/usr/bin/env bash
# Backup diário do Postgres para o Cloudflare R2. Roda no cron do usuário deploy:
#   0 7 * * * bash /home/deploy/pulsar/backup.sh >> /home/deploy/pulsar/backup.log 2>&1
# Só pinga o healthchecks.io se o dump subiu inteiro e o disco está abaixo do limite;
# sem ping em 25 h, o healthchecks.io manda e-mail. Retenção de 30 dias é regra do bucket.
set -euo pipefail
cd "$(dirname "$0")"

ler_env() { grep -E "^$1=" .env | tail -1 | cut -d= -f2-; }
USUARIO="$(ler_env POSTGRES_USER)"
BANCO="$(ler_env POSTGRES_DB)"
PING="$(ler_env HEALTHCHECKS_URL)"
LIMITE="${DISCO_LIMITE_PCT:-80}"
DESTINO="${BACKUP_DESTINO:-r2:pulsar-backups}"
ARQUIVO="pulsar-$(date -u +%F).dump"
COMPOSE=(docker compose -f docker-compose.prod.yml)

# pipefail: se o pg_dump cair no meio, o script para aqui e não pinga.
"${COMPOSE[@]}" exec -T db pg_dump -U "$USUARIO" -Fc "$BANCO" | rclone rcat "$DESTINO/$ARQUIVO"

TAMANHO="$("${COMPOSE[@]}" exec -T db psql -U "$USUARIO" -d "$BANCO" -tAc \
  "select pg_size_pretty(pg_database_size(current_database()))")"
USO="$(df --output=pcent / | tail -1 | tr -dc '0-9')"
echo "$(date -u +%FT%TZ) backup=$ARQUIVO banco=$TAMANHO disco=${USO}%"

if (( USO > LIMITE )); then
  echo "ERRO: disco em ${USO}% (limite ${LIMITE}%)" >&2
  exit 1
fi

curl -fsS --max-time 10 --retry 3 -o /dev/null "$PING"
