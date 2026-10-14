#!/usr/bin/env bash
# Testa o backup.sh com docker, rclone, df e curl falsos. Uso: bash deploy/testes/teste-backup.sh
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
falhas=0
ok()  { echo "  ok   $1"; }
erro() { echo "  ERRO $1" >&2; falhas=$((falhas + 1)); }

preparar() {
  DIR="$(mktemp -d)"; BIN="$DIR/bin"; mkdir -p "$BIN" "$DIR/r2"
  cp "$RAIZ/deploy/backup.sh" "$DIR/"
  printf 'POSTGRES_USER=pulsar\nPOSTGRES_DB=pulsar\nHEALTHCHECKS_URL=https://hc-ping.test/abc\n' > "$DIR/.env"
  # docker falso: pg_dump imprime um dump (ou falha), psql devolve o tamanho
  cat > "$BIN/docker" <<'EOF'
#!/usr/bin/env bash
case "$*" in
  *pg_dump*) [[ "${FALHAR_DUMP:-0}" == 1 ]] && exit 1; echo "DUMPFALSO" ;;
  *psql*) echo "123 MB" ;;
esac
EOF
  # rclone falso: rcat grava o stdin em ./r2/<arquivo>
  cat > "$BIN/rclone" <<'EOF'
#!/usr/bin/env bash
[[ "$1" == rcat ]] && cat > "r2/$(basename "$2")"
EOF
  cat > "$BIN/df" <<'EOF'
#!/usr/bin/env bash
printf 'Use%%\n %s%%\n' "${DF_PCT:-42}"
EOF
  cat > "$BIN/curl" <<'EOF'
#!/usr/bin/env bash
echo "$*" >> ping.log
EOF
  chmod +x "$BIN"/*
}
rodar() { (cd "$DIR" && PATH="$BIN:$PATH" BACKUP_DESTINO=r2:pulsar-backups "$@" bash ./backup.sh) > "$DIR/saida.log" 2>&1; }
ARQ="pulsar-$(date -u +%F).dump"

echo "Backup normal"
preparar
if rodar env; then ok "sai com 0"; else erro "devia sair com 0"; fi
[[ "$(cat "$DIR/r2/$ARQ" 2>/dev/null)" == "DUMPFALSO" ]] && ok "dump chegou ao destino com o nome do dia" || erro "dump ausente ou errado"
grep -q 'hc-ping.test/abc' "$DIR/ping.log" 2>/dev/null && ok "pingou o healthchecks" || erro "não pingou"
grep -q 'banco=123 MB disco=42%' "$DIR/saida.log" && ok "log com tamanho e disco" || erro "log sem tamanho/disco"

echo "pg_dump que falha não pinga"
preparar
if rodar env FALHAR_DUMP=1; then erro "devia sair com erro"; else ok "sai com erro"; fi
[[ ! -f "$DIR/ping.log" ]] && ok "não pingou" || erro "pingou mesmo com o dump falhando"

echo "Disco acima do limite não pinga"
preparar
if rodar env DF_PCT=85; then erro "devia sair com erro"; else ok "sai com erro"; fi
[[ ! -f "$DIR/ping.log" ]] && ok "não pingou" || erro "pingou com o disco cheio"

echo "Limite configurável (usado para provar o alerta na VPS)"
preparar
if rodar env DISCO_LIMITE_PCT=1; then erro "devia sair com erro"; else ok "limite de 1% dispara"; fi

(( falhas == 0 )) || { echo "Falhas: $falhas"; exit 1; }
echo "teste-backup passou."
