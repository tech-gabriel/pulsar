# Deploy — Pulsar

Guia de publicação em produção. A infra está descrita como código em
[`render.yaml`](../render.yaml) (Render Blueprint); este documento explica o
passo a passo e as configurações que dependem de você.

## Arquitetura

```
Navegador ──HTTPS──> pulsar-web (Render Static Site)
                         │  rewrite /api/* (proxy, same-origin)
                         ▼
                     pulsar-api (Render Web Service, Docker, always-on)
                         │  Npgsql (porta 5432)
                         ▼
                     Supabase (Postgres gerenciado)
```

- **Frontend** (`pulsar-web`): SPA Vite servida como site estático. Um *rewrite*
  `/api/*` → backend deixa tudo **same-origin** (o navegador não vê CORS).
- **Backend** (`pulsar-api`): API .NET 10 em container. Precisa ser **always-on**
  porque o `DataCollectionJob` roda a cada 15 min em processo (não pode hibernar).
- **Banco**: Supabase (externo, já provisionado). As *migrations* são aplicadas
  automaticamente no startup (`Migrate()`).

## Pré-requisitos (contas)

| Serviço | Para quê |
|---------|----------|
| [Render](https://render.com) | Hospedar backend + frontend |
| [Supabase](https://supabase.com) | Postgres (já configurado) |
| [OpenWeatherMap](https://openweathermap.org/api) | Dados climáticos |
| [MapTiler](https://cloud.maptiler.com) | Mapa + geocoding (busca de endereços) |
| [Resend](https://resend.com) | E-mail (reset de senha) |
| [Google Cloud](https://console.cloud.google.com) | Login com Google (opcional) |

## Passo a passo

### 1. Gerar os segredos
- **VAPID** (Web Push): `npx web-push generate-vapid-keys` → guarde `publicKey` e `privateKey`.
- **JWT**: não precisa gerar — o Blueprint usa `generateValue: true` e o Render cria um forte.
- **Connection string do Supabase**: Supabase → Project Settings → Database →
  *Connection string* → **Session pooler (porta 5432)**. Formato Npgsql:
  `Host=aws-0-<region>.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.<ref>;Password=<senha>`
  > Use o **Session pooler** (porta 5432), **não** o Transaction pooler (6543): o
  > transaction mode não suporta prepared statements do Npgsql/EF Core.
  > **Importante (IPv4):** prefira o host do *pooler* (`...pooler.supabase.com`) e
  > não o host direto (`db.<ref>.supabase.co`). O host direto é **IPv6**, e a saída
  > do Render pode não ter IPv6 — a conexão falharia. O pooler responde em IPv4.

### 2. Subir o Blueprint no Render
1. Render → **New → Blueprint** → conecte este repositório.
2. O Render lê o `render.yaml` e lista os dois serviços + os campos `sync: false`.
3. Preencha os valores (tabela abaixo) e crie. O 1º deploy faz build do Docker e
   do frontend, aplica as migrations no Supabase e sobe os serviços.

### 3. Ajustar a URL do proxy (se necessário)
O `render.yaml` aponta o rewrite para `https://pulsar-api.onrender.com`. Se o
Render tiver dado outro nome/URL ao backend, edite a regra de rewrite do
`pulsar-web` (Settings → Redirects/Rewrites) para a URL real do backend.

### 4. Configurar os serviços externos
- **Google OAuth**: no Google Cloud → Credenciais → seu OAuth Client (Web) →
  *Authorized JavaScript origins* → adicione a **URL pública do frontend**
  (ex.: `https://pulsar-web.onrender.com`). Use o **mesmo Client ID** em
  `Authentication__Google__ClientId` (backend) e `VITE_GOOGLE_CLIENT_ID` (frontend).
- **Resend (obrigatório para reset de senha funcionar)**: verifique o **domínio
  próprio** `app-pulsar.com.br` em resend.com/domains. O Resend mostra registros
  DNS (SPF/DKIM e, opcionalmente, DMARC) para adicionar no registro.br, junto com
  os do domínio do site. Depois use um remetente desse domínio em `Email__FromEmail`
  (ex.: `nao-responda@app-pulsar.com.br`).
  > **Enquanto o domínio não estiver verificado**, o Resend só entrega e-mails para
  > a sua própria conta. Ou seja, o reset de senha **não chega aos usuários reais**.
  > Verificar o domínio é pré-requisito para liberar esse fluxo no lançamento.

### 5. Smoke test
- [ ] `GET https://<backend>/health` → `Healthy`
- [ ] Frontend abre, login e cadastro funcionam
- [ ] Mapa carrega e mostra os scores das regiões
- [ ] Reset de senha envia e-mail (chega na caixa)
- [ ] Login com Google (se configurado)
- [ ] Notificações: ativar em Configurações → permitir → receber um alerta

## Referência de variáveis de ambiente

### Backend (`pulsar-api`)
| Variável | Exemplo / valor | Segredo? |
|----------|-----------------|----------|
| `ASPNETCORE_ENVIRONMENT` | `Production` | não (no Blueprint) |
| `ConnectionStrings__DefaultConnection` | `Host=db.<ref>.supabase.co;Port=5432;...` | **sim** |
| `Jwt__SecretKey` | *(gerado pelo Render)* | **sim** |
| `OpenWeatherMap__ApiKey` | `xxxxxxxx` | **sim** |
| `MapTiler__ApiKey` | `xxxxxxxx` | **sim** |
| `Email__Provider` | `Resend` | não (no Blueprint) |
| `Email__ApiKey` | `re_xxxxxxxx` | **sim** |
| `Email__FromEmail` | `alertas@seudominio.com` | **sim** |
| `Email__FromName` | `Pulsar` | não (no Blueprint) |
| `Authentication__Google__ClientId` | `...apps.googleusercontent.com` | **sim** |
| `Push__PublicKey` | *(chave VAPID pública)* | **sim** |
| `Push__PrivateKey` | *(chave VAPID privada)* | **sim** |
| `Push__Subject` | `mailto:equipe.app.pulsar@gmail.com` | **sim** |
| `Cors__AllowedOrigins__0` | `https://app-pulsar.com.br` | **sim** |
| `RecuperacaoSenha__UrlBaseFrontend` | `https://app-pulsar.com.br` | **sim** |

> Recursos **gated por config**: sem `Push__*` o push fica desligado (e o front
> esconde o opt-in); sem `Authentication__Google__ClientId` o login Google some;
> sem Resend configurado, e-mails caem no provider de Log.

### Frontend (`pulsar-web`) — build-time
| Variável | Observação |
|----------|------------|
| `VITE_MAPTILER_KEY` | Sem ela, o mapa usa o fallback CartoDB |
| `VITE_GOOGLE_CLIENT_ID` | Mesmo valor do `Authentication__Google__ClientId` |

> Variáveis `VITE_*` são embutidas no bundle **em build-time** — ao trocá-las é
> preciso refazer o deploy do frontend (rebuild).

## Notas

- **Always-on**: não use o free tier do backend (hiberna em ~15 min e quebra a
  coleta + gera cold starts). O plano Starter mantém o serviço ligado.
- **Headers de segurança**: o frontend (`pulsar-web`) envia `X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` e uma **CSP**
  (definidos em `render.yaml → headers`). A CSP libera só as origens externas usadas:
  Google Fonts, tiles do mapa (`api.maptiler.com`, `*.basemaps.cartocdn.com`),
  favicons de notícias (`www.google.com`) e o login Google (`accounts.google.com`).
  Ao adicionar um provedor externo novo (outro CDN de fontes/mapa, analytics, etc.),
  **atualize a CSP** ou o recurso será bloqueado pelo navegador. O backend também
  manda `nosniff`/`X-Frame-Options`/`Referrer-Policy` e uma CSP `default-src 'none'`
  (em produção) nas respostas da API.
  > **Validação no smoke test**: confirme que o mapa carrega os tiles, o login com
  > Google abre, as fontes aplicam e os favicons das notícias aparecem. Erros de CSP
  > saem no console do navegador (`Refused to load …`).
- **`AllowedHosts` (hardening opcional)**: hoje é `*`. Não é crítico (os links de
  reset usam `RecuperacaoSenha__UrlBaseFrontend`, não o header `Host`), mas após o
  provisionamento dá para fixar o host do backend definindo a env var `AllowedHosts`
  (ex.: `pulsar-api.onrender.com`) no serviço `pulsar-api`.
- **`X-Forwarded-For` / segurança**: atrás do proxy, o app confia no
  `X-Forwarded-For` (via `UseForwardedHeaders`) para o rate limiter ver o IP real.
  Como o IP do proxy é dinâmico em PaaS, `KnownProxies`/`KnownIPNetworks` ficam
  vazios; a confiança é limitada por **`ForwardLimit = 1`** — só o último salto
  (o proxy do Render, que anexa o IP real do cliente) é usado, então um
  `X-Forwarded-For` forjado pelo cliente fica à esquerda e é ignorado. Isso
  fecha a evasão de rate limit. **Premissa**: a plataforma sempre anexa o IP de
  conexão ao `X-Forwarded-For` (Render faz). Se trocar de plataforma, confirme
  esse comportamento ou fixe as faixas de IP do proxy em `KnownIPNetworks`.
- **Alternativa de menor custo**: servir o frontend pelo próprio backend (um único
  serviço, 100% same-origin, sem o site estático). Mais barato, mas acopla os
  deploys e engorda a imagem — não adotado aqui em favor da separação.
- **Domínio próprio**: já declarado no `render.yaml` (campo `domains:` do
  `pulsar-web`): `app-pulsar.com.br` (principal) e `www.app-pulsar.com.br` (redireciona
  para o apex). O Blueprint provisiona o custom domain; basta criar no registro.br os
  registros DNS que o Render exibir (apex = registros A; www = CNAME) e aguardar a
  propagação + emissão do SSL. **Só o frontend usa o domínio**; o backend continua no
  `pulsar-api.onrender.com` (interno, alcançado pelo rewrite same-origin). As envs de
  URL do frontend (`Cors__AllowedOrigins__0`, `RecuperacaoSenha__UrlBaseFrontend`) já
  devem apontar para `https://app-pulsar.com.br`. Ao ativar o login Google no futuro,
  adicione esse domínio às *Authorized JavaScript origins* no Google Cloud.
