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
  *Connection string* → **Session mode (porta 5432)**. Formato Npgsql:
  `Host=db.<ref>.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=<senha>`
  > Use 5432 (session), **não** 6543 (transaction) — o pooler em transaction mode
  > não suporta prepared statements do Npgsql/EF Core.

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
- **Resend**: verifique um **domínio próprio** (resend.com/domains) e use um
  remetente desse domínio em `Email__FromEmail`. Sem domínio verificado, e-mails
  só chegam à sua própria conta Resend.

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
| `Push__Subject` | `mailto:contato@seudominio.com` | **sim** |
| `Cors__AllowedOrigins__0` | `https://pulsar-web.onrender.com` | **sim** |
| `RecuperacaoSenha__UrlBaseFrontend` | `https://pulsar-web.onrender.com` | **sim** |

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
- **`X-Forwarded-For` / segurança**: atrás do proxy, o app confia no
  `X-Forwarded-For` (via `UseForwardedHeaders`) para o rate limiter ver o IP real.
  Como o IP do proxy é dinâmico, `KnownProxies`/`KnownIPNetworks` ficam vazios —
  um cliente poderia, em tese, forjar o header para escapar do rate limit. É um
  risco baixo aceitável para este app; se virar problema, fixe as faixas de IP do
  Render como proxies conhecidos.
- **Alternativa de menor custo**: servir o frontend pelo próprio backend (um único
  serviço, 100% same-origin, sem o site estático). Mais barato, mas acopla os
  deploys e engorda a imagem — não adotado aqui em favor da separação.
- **Domínio próprio**: pode ser adicionado depois nos dois serviços (Render →
  Settings → Custom Domains); lembre de atualizar as origens do Google e as envs
  de URL do frontend.
