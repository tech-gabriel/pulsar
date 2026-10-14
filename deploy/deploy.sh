#!/usr/bin/env bash
# Deploy de uma tag na VPS. Volta sozinho para a tag anterior se os containers não
# subirem ou o /health não responder a tempo. Roda em ~/pulsar, ao lado do .env e do
# docker-compose.prod.yml.
# Uso: bash deploy.sh sha-abc1234-57   (o workflow gera sha-<commit>-<execução>)
set -euo pipefail
cd "$(dirname "$0")"

NOVA="${1:?uso: deploy.sh <tag>}"
# A tag chega de um input manual do workflow e vai para o sed e para o compose:
# só o formato que o workflow gera passa.
if [[ ! "$NOVA" =~ ^sha-[0-9a-f]{7}(-[0-9]+)?$ ]]; then
  echo "ERRO: tag fora do formato sha-<7 hex>[-<número>]: $NOVA" >&2
  exit 2
fi
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

echo "Deploy de $NOVA (anterior: ${ANTERIOR:-nenhuma})"

# Pull primeiro, com a tag só no ambiente (vence a do .env): se a imagem não existir,
# nada muda e os containers atuais seguem no ar.
if ! TAG="$NOVA" "${COMPOSE[@]}" pull; then
  echo "ERRO: pull de $NOVA falhou; nada foi alterado" >&2
  exit 1
fi

# ponytail: recriar o container da API deixa o app de 10 a 20 s fora do ar. Se isso
# passar a importar, subir dois containers da API atrás do Caddy (blue-green).
gravar_tag "$NOVA"
if "${COMPOSE[@]}" up -d --remove-orphans && saudavel; then
  echo "OK: $NOVA no ar"
  exit 0
fi

echo "ERRO: $NOVA não subiu ou o /health não respondeu em ${ESPERA}s" >&2
if [[ -n "$ANTERIOR" && "$ANTERIOR" != "$NOVA" ]]; then
  echo "Voltando para $ANTERIOR" >&2
  gravar_tag "$ANTERIOR"
  "${COMPOSE[@]}" up -d --remove-orphans || true
  saudavel || echo "ATENÇÃO: $ANTERIOR também não respondeu" >&2
fi
exit 1
