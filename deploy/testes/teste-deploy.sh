#!/usr/bin/env bash
# shellcheck disable=SC2015  # ok() só faz echo e nunca falha, então A && ok || erro é seguro aqui
# Testa o deploy.sh com docker, curl e sleep falsos. Uso: bash deploy/testes/teste-deploy.sh
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
falhas=0
ok()  { echo "  ok   $1"; }
erro() { echo "  ERRO $1" >&2; falhas=$((falhas + 1)); }

preparar() { # tag inicial no .env (vazia = primeiro deploy)
  DIR="$(mktemp -d)"; BIN="$DIR/bin"; mkdir -p "$BIN"
  cp "$RAIZ/deploy/deploy.sh" "$DIR/"
  { echo "SITE_DOMAIN=exemplo.test"; [[ -n "$1" ]] && echo "TAG=$1"; } > "$DIR/.env"
  # docker falso: registra a chamada com a TAG que está no .env naquele momento
  cat > "$BIN/docker" <<'EOF'
#!/usr/bin/env bash
echo "$* | $(grep '^TAG=' .env)" >> docker.log
EOF
  # curl falso: o /health falha quando a tag em uso é sha-ruim
  cat > "$BIN/curl" <<'EOF'
#!/usr/bin/env bash
grep -q '^TAG=sha-ruim$' .env && exit 22
exit 0
EOF
  printf '#!/usr/bin/env bash\nexit 0\n' > "$BIN/sleep"
  chmod +x "$BIN"/*
}
rodar() { (cd "$DIR" && PATH="$BIN:$PATH" DEPLOY_ESPERA_SEG=1 bash ./deploy.sh "$@") >/dev/null 2>&1; }
tag_no_env() { grep '^TAG=' "$DIR/.env" | cut -d= -f2; }

echo "Tag boa"
preparar sha-velha
if rodar sha-nova; then ok "sai com 0"; else erro "devia sair com 0"; fi
[[ "$(tag_no_env)" == "sha-nova" ]] && ok ".env com a tag nova" || erro ".env: $(tag_no_env)"
grep -q 'pull | TAG=sha-nova' "$DIR/docker.log" && ok "fez pull da nova" || erro "sem pull da nova"
grep -q 'up -d --remove-orphans | TAG=sha-nova' "$DIR/docker.log" && ok "subiu a nova" || erro "não subiu a nova"

echo "Tag ruim volta para a anterior"
preparar sha-velha
if rodar sha-ruim; then erro "devia sair com 1"; else ok "sai com erro"; fi
[[ "$(tag_no_env)" == "sha-velha" ]] && ok ".env voltou para a anterior" || erro ".env: $(tag_no_env)"
grep -q 'up -d --remove-orphans | TAG=sha-velha' "$DIR/docker.log" && ok "subiu a anterior" || erro "não subiu a anterior"

echo "Primeiro deploy ruim não tem para onde voltar"
preparar ""
if rodar sha-ruim; then erro "devia sair com 1"; else ok "sai com erro"; fi
[[ "$(grep -c 'up -d' "$DIR/docker.log")" == "1" ]] && ok "não tentou voltar" || erro "tentou voltar sem tag anterior"

echo "Sem argumento"
preparar sha-velha
if rodar; then erro "devia exigir a tag"; else ok "exige a tag"; fi

(( falhas == 0 )) || { echo "Falhas: $falhas"; exit 1; }
echo "teste-deploy passou."
