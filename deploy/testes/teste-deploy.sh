#!/usr/bin/env bash
# shellcheck disable=SC2015  # ok() só faz echo e nunca falha, então A && ok || erro é seguro aqui
# Testa o deploy.sh com docker, curl e sleep falsos. Uso: bash deploy/testes/teste-deploy.sh
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
falhas=0
ok()  { echo "  ok   $1"; }
erro() { echo "  ERRO $1" >&2; falhas=$((falhas + 1)); }

# Tags no formato que o workflow gera: sha-<7 hex>-<número da execução>
VELHA=sha-1111111-1
NOVA=sha-2222222-2
RUIM=sha-badbad0-3          # sobe, mas o /health não responde
INEXISTENTE=sha-0000000-4   # o pull falha

preparar() { # tag inicial no .env (vazia = primeiro deploy)
  DIR="$(mktemp -d)"; BIN="$DIR/bin"; mkdir -p "$BIN"
  cp "$RAIZ/deploy/deploy.sh" "$DIR/"
  { echo "SITE_DOMAIN=exemplo.test"; [[ -n "$1" ]] && echo "TAG=$1"; } > "$DIR/.env"
  # docker falso: registra a chamada com a TAG que o compose usaria (a do ambiente
  # vence a do .env) e falha o pull da tag inexistente
  cat > "$BIN/docker" <<EOF
#!/usr/bin/env bash
tag="\${TAG:-\$(grep '^TAG=' .env | cut -d= -f2)}"
echo "\$* | TAG=\$tag" >> docker.log
[[ "\$*" == *pull* && "\$tag" == "$INEXISTENTE" ]] && exit 1
exit 0
EOF
  # curl falso: o /health falha quando a tag em uso é a ruim
  cat > "$BIN/curl" <<EOF
#!/usr/bin/env bash
grep -q '^TAG=$RUIM\$' .env && exit 22
exit 0
EOF
  printf '#!/usr/bin/env bash\nexit 0\n' > "$BIN/sleep"
  chmod +x "$BIN"/*
}
rodar() { (cd "$DIR" && PATH="$BIN:$PATH" DEPLOY_ESPERA_SEG=1 bash ./deploy.sh "$@") >/dev/null 2>&1; }
tag_no_env() { grep '^TAG=' "$DIR/.env" | cut -d= -f2; }
chamadas() { if [[ -f "$DIR/docker.log" ]]; then grep -c "$1" "$DIR/docker.log" || true; else echo 0; fi; }

echo "Tag boa"
preparar "$VELHA"
if rodar "$NOVA"; then ok "sai com 0"; else erro "devia sair com 0"; fi
[[ "$(tag_no_env)" == "$NOVA" ]] && ok ".env com a tag nova" || erro ".env: $(tag_no_env)"
grep -q "pull | TAG=$NOVA" "$DIR/docker.log" && ok "fez pull da nova" || erro "sem pull da nova"
grep -q "up -d --remove-orphans | TAG=$NOVA" "$DIR/docker.log" && ok "subiu a nova" || erro "não subiu a nova"

echo "Tag ruim volta para a anterior"
preparar "$VELHA"
if rodar "$RUIM"; then erro "devia sair com 1"; else ok "sai com erro"; fi
[[ "$(tag_no_env)" == "$VELHA" ]] && ok ".env voltou para a anterior" || erro ".env: $(tag_no_env)"
grep -q "up -d --remove-orphans | TAG=$VELHA" "$DIR/docker.log" && ok "subiu a anterior" || erro "não subiu a anterior"

echo "Pull que falha não mexe em nada"
preparar "$VELHA"
if rodar "$INEXISTENTE"; then erro "devia sair com 1"; else ok "sai com erro"; fi
[[ "$(tag_no_env)" == "$VELHA" ]] && ok ".env continua com a tag em uso" || erro ".env: $(tag_no_env)"
[[ "$(chamadas 'up -d')" == "0" ]] && ok "não recriou containers" || erro "recriou containers sem imagem nova"

echo "Primeiro deploy ruim não tem para onde voltar"
preparar ""
if rodar "$RUIM"; then erro "devia sair com 1"; else ok "sai com erro"; fi
[[ "$(chamadas 'up -d')" == "1" ]] && ok "não tentou voltar" || erro "tentou voltar sem tag anterior"

echo "Tag fora do formato é recusada antes de tudo"
for tag in 'x; rm -rf ~' 'sha-abc/def' 'latest' 'sha-ABCDEF1'; do
  preparar "$VELHA"
  if rodar "$tag"; then erro "aceitou '$tag'"; else ok "recusou '$tag'"; fi
  [[ "$(chamadas .)" == "0" ]] || erro "chamou o docker com '$tag'"
done

echo "Tag sem o número da execução também vale"
preparar "$VELHA"
if rodar sha-abc1234; then ok "aceita sha-abc1234"; else erro "recusou sha-abc1234"; fi

echo "Sem argumento"
preparar "$VELHA"
if rodar; then erro "devia exigir a tag"; else ok "exige a tag"; fi

(( falhas == 0 )) || { echo "Falhas: $falhas"; exit 1; }
echo "teste-deploy passou."
