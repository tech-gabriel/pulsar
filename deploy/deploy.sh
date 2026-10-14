#!/usr/bin/env bash
# Deploy de uma tag na VPS. Volta sozinho para a tag anterior se o /health não
# responder a tempo. Roda em ~/pulsar, ao lado do .env e do docker-compose.prod.yml.
# Uso: bash deploy.sh sha-abc1234
set -euo pipefail
cd "$(dirname "$0")"

NOVA="${1:?uso: deploy.sh <tag>}"
ESPERA="${DEPLOY_ESPERA_SEG:-120}"
INTERVALO="${DEPLOY_INTERVALO_SEG:-5}"
COMPOSE=(docker compose -f docker-compose.prod.yml)

ler_env() { grep -E "^$1=" .env | tail -1 | cut -d= -f2-; }
gravar_tag() {
  if grep -qE '^TAG=' .env; then sed -i "s/^TAG=.*/TAG=$1/" .env; else echo "TAG=$1" >> .env; fi
}

DOMINIO="$(ler_env SITE_DOMAIN)"
ANTERIOR="$(ler_env TAG || true)"

# Confere o caminho inteiro (Caddy, TLS, API, banco) sem depender do DNS público.
saudavel() {
  local fim=$((SECONDS + ESPERA))
  while (( SECONDS < fim )); do
    if curl -fsS -o /dev/null --max-time 10 --resolve "$DOMINIO:443:127.0.0.1" "https://$DOMINIO/health"; then
      return 0
    fi
    sleep "$INTERVALO"
  done
  return 1
}

# ponytail: recriar o container da API deixa o app de 10 a 20 s fora do ar. Se isso
# passar a importar, subir dois containers da API atrás do Caddy (blue-green).
subir() {
  gravar_tag "$1"
  "${COMPOSE[@]}" pull
  "${COMPOSE[@]}" up -d --remove-orphans
}

echo "Deploy de $NOVA (anterior: ${ANTERIOR:-nenhuma})"
subir "$NOVA"
if saudavel; then
  echo "OK: $NOVA no ar"
  exit 0
fi

echo "ERRO: /health não respondeu em ${ESPERA}s com $NOVA" >&2
if [[ -n "$ANTERIOR" && "$ANTERIOR" != "$NOVA" ]]; then
  echo "Voltando para $ANTERIOR" >&2
  subir "$ANTERIOR"
  saudavel || echo "ATENÇÃO: $ANTERIOR também não respondeu" >&2
fi
exit 1
