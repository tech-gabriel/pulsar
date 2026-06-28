# Deploy do Pulsar — Passo a Passo (runbook)

Guia prático para colocar o Pulsar no ar em produção, do zero, seguindo as
decisões já tomadas:

- **Domínio:** `app-pulsar.com.br` (registrado no registro.br), usado desde o início.
- **Stack:** Render (backend + frontend) + Supabase (banco) + Resend (e-mail).
- **Sem login Google no lançamento** (a gente adiciona depois).

> Como usar este arquivo: faça um passo por vez, na ordem. No fim de cada passo há
> um **✅ CHECKPOINT** — quando chegar nele, me avise o que aconteceu (deu certo,
> deu erro, ou apareceu tal coisa) que eu confiro antes de seguir.
>
> Onde aparecer `<algo>`, é um valor que você substitui. Nunca cole senhas/segredos
> aqui neste arquivo nem no chat; eles vão direto nos painéis (Render/Supabase/etc.).

---

## Visão geral da ordem

1. Reunir os segredos que **não** dependem de DNS (Supabase).
2. Adicionar o domínio no **Resend** e anotar os registros DNS dele.
3. Subir o **Blueprint no Render** e anotar os registros DNS do domínio.
4. Ir ao **registro.br** uma única vez e cadastrar **todos** os registros DNS (site + e-mail).
5. Esperar propagar (DNS + SSL) e fazer o **smoke test**.

Existe uma dependência circular natural: o Render e o Resend só te dão os registros
DNS **depois** que você adiciona o domínio neles. Por isso a ordem acima: primeiro
você "abre" o domínio nos dois serviços, junta os registros, e só então mexe no
registro.br de uma vez.

---

## Pré-requisito: o código precisa estar na branch `master`

O Render lê o arquivo `render.yaml` da branch `master`. As mudanças de deploy
(domínio no Blueprint) estão no PR #63. **Antes de provisionar, este PR precisa
estar mergeado e promovido para a master.**

✅ **CHECKPOINT 0:** me avise para eu mergear o PR #63 em develop e promover para a
master. (Sem isso, o Blueprint do Render não terá o domínio configurado.)

---

## Passo 1 — Supabase: pegar a connection string (Session Pooler)

O banco já existe. Você só precisa da string de conexão **certa** (a do pooler, que
é IPv4 — o host direto é IPv6 e pode não conectar a partir do Render).

1. Acesse [supabase.com](https://supabase.com) → seu projeto do Pulsar.
2. Menu **Project Settings** (engrenagem) → **Database**.
3. Procure a seção **Connection string** → aba **Session pooler** (NÃO "Transaction
   pooler", NÃO "Direct connection").
4. Selecione o formato **.NET** se houver; senão copie o genérico e a gente adapta.
   O que importa é o host terminar em `...pooler.supabase.com` e a porta ser **5432**.
5. O formato que o backend espera (Npgsql) é:
   ```
   Host=aws-0-<regiao>.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.<ref>;Password=<sua-senha>
   ```
   - `<ref>` é o ID do seu projeto (aparece no host/username do Supabase).
   - `<sua-senha>` é a senha do banco (a que você definiu ao criar o projeto; se
     esqueceu, dá para resetar em Database → **Reset database password**).
6. Guarde essa string num lugar seguro (gerenciador de senhas). Você vai colar no
   Render no Passo 3.

> Observação: o schema/tabelas já foram aplicados no Supabase em sessões anteriores,
> e o backend roda as migrations no startup. Não precisa rodar nada manual aqui.

✅ **CHECKPOINT 1:** me diga se conseguiu montar a string no formato acima (sem
colar a senha aqui — só confirme "consegui, host termina em pooler.supabase.com e
porta 5432" ou me mostre o erro/dúvida).

---

## Passo 2 — Resend: adicionar e preparar a verificação do domínio

Hoje o Resend só entrega e-mail para a sua própria conta. Para o **reset de senha**
funcionar para usuários reais, o domínio `app-pulsar.com.br` precisa ser verificado.

1. Acesse [resend.com](https://resend.com) → faça login.
2. Menu **Domains** → **Add Domain**.
3. Digite `app-pulsar.com.br` e confirme. (Pode escolher uma região de envio; tanto
   faz para o nosso caso.)
4. O Resend vai mostrar uma lista de **registros DNS** para você criar (geralmente:
   um ou mais `TXT`/`CNAME` de **DKIM**, um `TXT` de **SPF**, e às vezes um `MX` e um
   `DMARC`). **Não feche essa tela.**
5. **Anote/printe todos esses registros** exatamente como aparecem (Tipo, Nome/Host,
   Valor). Você vai cadastrá-los no registro.br no Passo 4, junto com os do site.

> Ainda **não** clique em "Verify" agora — os registros só existirão depois que você
> cadastrar no registro.br. A verificação acontece no Passo 5.

✅ **CHECKPOINT 2:** me mande a lista de registros que o Resend pediu (pode ser
print ou texto). Eu confiro se está tudo certo e te ajudo a traduzir cada um para o
formato do registro.br.

---

## Passo 3 — Render: subir o Blueprint e colar os segredos

> Faça este passo só **depois** do CHECKPOINT 0 (PR #63 na master).

1. Acesse [render.com](https://render.com) → crie a conta / faça login (pode logar
   com o GitHub para facilitar a conexão do repositório).
2. **New** (canto superior) → **Blueprint**.
3. Conecte o repositório **`tech-gabriel/pulsar`** (autorize o Render no GitHub se
   ele pedir). O Render vai detectar o `render.yaml` e listar **2 serviços**:
   `pulsar-api` (backend) e `pulsar-web` (frontend).
4. Ele vai pedir os valores marcados como segredo (`sync: false`). Preencha assim:

   **No serviço `pulsar-api` (backend):**

   | Campo | O que colar |
   |---|---|
   | `ConnectionStrings__DefaultConnection` | a string do **Session Pooler** (Passo 1) |
   | `OpenWeatherMap__ApiKey` | sua chave do OpenWeatherMap |
   | `MapTiler__ApiKey` | sua chave do MapTiler |
   | `Email__ApiKey` | seu token do Resend (começa com `re_`) |
   | `Email__FromEmail` | `nao-responda@app-pulsar.com.br` |
   | `Push__PublicKey` | sua VAPID public key |
   | `Push__PrivateKey` | sua VAPID private key |
   | `Push__Subject` | `mailto:equipe.app.pulsar@gmail.com` |
   | `Cors__AllowedOrigins__0` | `https://app-pulsar.com.br` |
   | `RecuperacaoSenha__UrlBaseFrontend` | `https://app-pulsar.com.br` |
   | `Authentication__Google__ClientId` | **deixe em branco** (sem Google agora) |

   **No serviço `pulsar-web` (frontend):**

   | Campo | O que colar |
   |---|---|
   | `VITE_MAPTILER_KEY` | sua chave do MapTiler (a mesma de cima) |
   | `VITE_GOOGLE_CLIENT_ID` | **deixe em branco** |

   > As chaves que você já usa localmente podem ser reaproveitadas. Se precisar
   > consultá-las, rode no seu PC, na pasta do projeto:
   > `dotnet user-secrets list --project Pulsar.API`
   >
   > `Jwt__SecretKey` **não** aparece para preencher — o Render gera sozinho.

5. Confirme e crie (**Apply** / **Create**). O Render vai:
   - construir a imagem Docker do backend e o build do frontend;
   - aplicar as migrations no Supabase (no startup do backend);
   - subir os dois serviços.
6. Acompanhe os **Logs** de cada serviço. O 1º build leva alguns minutos.

> ⚠️ Se o backend não subir com erro de conexão ao banco (timeout / "no such host" /
> falha de IPv6): quase sempre é a connection string. Confirme que está usando o
> **Session Pooler** (`...pooler.supabase.com:5432`) e não o host direto
> (`db.<ref>.supabase.co`). Me avise que eu te ajudo a ler o log.

✅ **CHECKPOINT 3:** me diga (a) se os dois serviços ficaram "Live"/verdes, (b) a URL
que o Render deu para o backend (algo como `https://pulsar-api.onrender.com` — se for
diferente, preciso ajustar o proxy), e (c) qualquer erro nos logs.

---

## Passo 4 — registro.br: cadastrar todos os registros DNS

Agora você junta **dois conjuntos** de registros e cadastra de uma vez:

- **Do site** (o Render mostra em cada serviço → **Settings → Custom Domains**, ou
  já na tela do Blueprint): registros para `app-pulsar.com.br` e `www.app-pulsar.com.br`.
  Normalmente o apex usa **registros A** (IPs do Render) e o `www` usa um **CNAME**.
- **Do e-mail** (do Passo 2, Resend): os `TXT`/`CNAME`/`MX`/`DMARC` de verificação.

Passos no registro.br:

1. Acesse [registro.br](https://registro.br) → login → seu domínio `app-pulsar.com.br`.
2. Entre em **DNS** → **Editar zona** (ou "Configurar endereçamento" → "Editar zona DNS").
3. Para **cada** registro pedido (site + Resend), clique em adicionar e preencha:
   - **Tipo** (A, CNAME, TXT, MX…)
   - **Nome/Host**: atenção à convenção. No registro.br, para o domínio raiz você
     normalmente deixa o nome **em branco** ou usa `@`. Para subdomínios (ex.: `www`
     ou o host de DKIM tipo `resend._domainkey`), use **só a parte da esquerda**
     (sem repetir `.app-pulsar.com.br` no fim).
   - **Valor/Dados**: exatamente o que o Render/Resend forneceu.
   - **TTL**: pode deixar o padrão.
4. Salve a zona.

> Eu te ajudo a montar a tabela exata "Tipo / Nome / Valor" para o registro.br assim
> que você me mandar os registros do Render (CHECKPOINT 3) e do Resend (CHECKPOINT 2).
> A parte que mais confunde é o "Nome/Host"; a gente acerta isso junto.

✅ **CHECKPOINT 4:** me confirme quando tiver salvo todos os registros (ou me mande
print da zona DNS para eu conferir antes de você salvar).

---

## Passo 5 — Propagação, SSL e verificações

1. **DNS leva de minutos a algumas horas** para propagar. Dá para acompanhar em
   [dnschecker.org](https://dnschecker.org) (busque `app-pulsar.com.br` tipo A e
   `www` tipo CNAME).
2. **Render:** em **Settings → Custom Domains**, o status do domínio vira "Verified"
   e o **certificado SSL** é emitido automaticamente (pode levar alguns minutos
   depois que o DNS propaga).
3. **Resend:** volte em **Domains** e clique em **Verify**. Quando o DNS estiver ok,
   o status vira **Verified**.

✅ **CHECKPOINT 5:** me avise quando (a) o domínio do site estiver "Verified" com SSL
no Render e (b) o domínio estiver "Verified" no Resend.

---

## Passo 6 — Smoke test (testar tudo no ar)

Acesse `https://app-pulsar.com.br` e teste, marcando cada item:

- [ ] O site abre com HTTPS (cadeado), sem aviso de certificado.
- [ ] **Health do backend:** abra `https://app-pulsar.com.br/api/health` → deve
      responder algo como `Healthy`.
- [ ] **Cadastro** de uma conta nova (e-mail e senha) funciona e te leva ao app.
- [ ] **Login** com essa conta funciona.
- [ ] O **mapa** carrega com os scores das regiões e a **busca por lugares**
      (ex.: "Parque Ibirapuera") encontra e abre a região.
- [ ] **Reset de senha:** peça "esqueci minha senha" e confirme que o e-mail
      **chega na caixa** (precisa do Resend verificado — Passo 5).
- [ ] **Notificações:** em Configurações, ative as notificações, permita no
      navegador e confirme que não dá erro.
- [ ] Abra o **console do navegador** (F12) e veja se **não** há erros de CSP
      ("Refused to load…") nem de rede no carregamento.

✅ **CHECKPOINT 6:** me mande o resultado de cada item (✅/❌). Para qualquer ❌, me
diga a mensagem de erro que aparecer (tela ou console) que eu te ajudo a corrigir.

---

## Apêndice — problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Backend não sobe, erro de banco (timeout / host) | Connection string com host direto (IPv6) | Trocar para a string do **Session Pooler** (`...pooler.supabase.com:5432`) |
| `/api/...` dá 404 ou erro de proxy | Nome/URL do backend diferente de `pulsar-api.onrender.com` | Me avisar a URL real para ajustar o rewrite no `render.yaml` |
| Reset de senha não chega | Domínio não verificado no Resend | Concluir Passo 5 (verificar no Resend) |
| Mapa sem nomes/tiles ou recurso "Refused to load" no console | CSP bloqueando uma origem nova | Me mandar a linha do console; ajusto a CSP no `render.yaml` |
| Domínio "not verified" no Render por muito tempo | DNS errado ou ainda propagando | Conferir os registros no registro.br (Nome/Host) e aguardar |
| Backend hiberna e a coleta para | Plano free no backend | Garantir o plano **Starter** (always-on) no `pulsar-api` |

---

## Resumo dos segredos (checklist do que ter em mãos)

- [ ] Connection string do **Session Pooler** do Supabase
- [ ] Chave **OpenWeatherMap**
- [ ] Chave **MapTiler** (back e front)
- [ ] Token **Resend** (`re_...`) + remetente `nao-responda@app-pulsar.com.br`
- [ ] Par **VAPID** (public + private) + subject `mailto:equipe.app.pulsar@gmail.com`
- [ ] URLs: `https://app-pulsar.com.br` (CORS e reset)
- [ ] Google: **em branco** (lançamento sem login Google)

> Você já tem praticamente todos esses valores no seu ambiente local
> (`dotnet user-secrets list --project Pulsar.API`). O único realmente novo é a
> connection string do **pooler** do Supabase.
