#!/usr/bin/env bash
# Sobe a pilha de produção na máquina local (imagens com TAG=local) e confere o que o
# Render fazia pelo site: cabeçalhos, páginas de SEO, fallback de SPA, proxy da API,
# cache e redirecionamento do www. Uso, da raiz do repo: bash deploy/testes/smoke.sh
set -euo pipefail
cd "$(dirname "$0")/../.."

ENV_TESTE=deploy/testes/smoke.env
export ENV_FILE="$ENV_TESTE"
COMPOSE=(docker compose -p pulsar-smoke -f docker-compose.prod.yml --env-file "$ENV_TESTE")
BASE=https://localhost:8443
CURL=(curl -sk --max-time 10)
falhas=0

ok()  { echo "  ok   $1"; }
erro() { echo "  ERRO $1" >&2; falhas=$((falhas + 1)); }
espera_conter() { # descrição, texto, padrão
  if grep -qiF -- "$3" <<<"$2"; then ok "$1"; else erro "$1 (sem: $3)"; fi
}

trap '"${COMPOSE[@]}" down -v >/dev/null 2>&1 || true' EXIT

echo "Configuração do compose"
config="$("${COMPOSE[@]}" config)"
if [[ "$(grep -c '^        max-size: 10m' <<<"$config" || true)" == "3" ]]; then ok "logs rotacionados nos três serviços"; else erro "rotação de log fora de algum serviço"; fi
espera_conter "memória compartilhada do Postgres" "$config" 'shm_size: "268435456"'

echo "Build das imagens locais"
docker build -q -t ghcr.io/tech-gabriel/pulsar-api:local -f Dockerfile . >/dev/null
docker build -q -t ghcr.io/tech-gabriel/pulsar-web:local -f deploy/Dockerfile.web . >/dev/null

echo "Subindo a pilha"
"${COMPOSE[@]}" up -d >/dev/null

echo "Esperando o /health (até 120 s)"
for _ in $(seq 1 60); do
  "${CURL[@]}" -fo /dev/null "$BASE/health" && break
  sleep 2
done

echo "Conferindo"
espera_conter "/health responde JSON da API" "$("${CURL[@]}" "$BASE/health")" '"status"'

cab_raiz="$("${CURL[@]}" -D - -o /dev/null -H 'Accept-Encoding: gzip' "$BASE/")"
espera_conter "CSP do site" "$cab_raiz" "content-security-policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' https://accounts.google.com https://*.posthog.com;"
espera_conter "X-Frame-Options" "$cab_raiz" "x-frame-options: DENY"
espera_conter "X-Content-Type-Options" "$cab_raiz" "x-content-type-options: nosniff"
espera_conter "Referrer-Policy" "$cab_raiz" "referrer-policy: strict-origin-when-cross-origin"
espera_conter "Permissions-Policy" "$cab_raiz" "permissions-policy: geolocation=(self)"
espera_conter "HTML sem cache longo" "$cab_raiz" "cache-control: no-cache"
espera_conter "compressão" "$cab_raiz" "content-encoding: gzip"

espera_conter "landing prerenderizada em /" "$("${CURL[@]}" "$BASE/")" "Pulsar"
espera_conter "página de zona com o HTML dela" "$("${CURL[@]}" "$BASE/risco-de-alagamento/zona-sul")" "Zona Sul"
espera_conter "página de subprefeitura com o HTML dela" "$("${CURL[@]}" "$BASE/risco-de-alagamento/vila-mariana")" "Vila Mariana"
espera_conter "/login cai no spa.html" "$("${CURL[@]}" "$BASE/login")" '<div id="app"></div>'

asset="$("${CURL[@]}" "$BASE/" | grep -o '/assets/[^"]*\.js' | head -1)"
espera_conter "asset com cache imutável" "$("${CURL[@]}" -D - -o /dev/null "$BASE$asset")" "immutable"

cab_api="$("${CURL[@]}" -D - -o /dev/null "$BASE/api/rota-que-nao-existe")"
espera_conter "/api chega na API (404 dela)" "$(head -1 <<<"$cab_api")" " 404"
espera_conter "/api mantém a CSP da API" "$cab_api" "content-security-policy: default-src 'none'; frame-ancestors 'none'"

cab_www="$(curl -sk --max-time 10 -D - -o /dev/null --resolve www.localhost:8443:127.0.0.1 https://www.localhost:8443/sobre)"
espera_conter "www redireciona para o apex" "$cab_www" "location: https://localhost/sobre"

if (( falhas > 0 )); then
  echo "Falhas: $falhas"; "${COMPOSE[@]}" logs --tail 50 >&2; exit 1
fi
echo "Smoke test passou."
