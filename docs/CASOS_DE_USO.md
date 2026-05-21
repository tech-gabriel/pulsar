# PULSAR | Casos de Uso — v2.0

**UNIVERSIDADE FEDERAL DE MATO GROSSO DO SUL** — Curso de Tecnologia da Informação

*Pulsar: O mapa vivo da sua segurança.* — São Paulo, SP - 2026

---

## 1. ATORES DO SISTEMA

- **Usuário final:** Acessa via navegador. Requer autenticação para todas as funcionalidades.
- **Scheduler (ator interno):** DataCollectionJob — coleta automática a cada 15min.
- **API OpenWeatherMap (ator externo):** Dados meteorológicos em tempo real.

---

## 2. LISTA DE CASOS DE USO

| ID | Nome | Descrição |
|---|---|---|
| UC-01 | Cadastrar Usuário | Criar conta com nome, e-mail e senha |
| UC-02 | Realizar Login | Autenticar com e-mail e senha, gerar JWT |
| UC-03 | Realizar Logout | Encerrar sessão e invalidar JWT |
| UC-04 | Visualizar Mapa de Risco | Mapa interativo com heatmap colorido por região |
| UC-05 | Consultar Detalhes de Região | Score agregado, subprefeituras e variáveis climáticas |
| UC-06 | Visualizar Painel de Alertas | Regiões ordenadas por score + sugestões do catálogo |
| UC-07 | Coletar Dados Climáticos | BackgroundService consulta OpenWeatherMap (32 subpref.) |
| UC-08 | Calcular Score de Perigo | Score por subprefeitura + agregação MAX por região |
| UC-09 | Atualizar Heatmap | Frontend atualiza automaticamente via polling |
| UC-10 | Consultar Histórico Climático | Gráfico das últimas 24h de uma subprefeitura |
| UC-11 | Gerenciar Regiões Favoritas | Favoritar/desfavoritar para monitoramento priorizado |

---

## 3. DESCRIÇÃO DETALHADA

### UC-01: Cadastrar Usuário
- **Ator:** Usuário final
- **Pré-condição:** Não possui conta cadastrada
- **Fluxo Principal:** Acessa cadastro → informa nome/email/senha → sistema valida (email formato, senha min 8 chars + 2 números + 1 especial) → verifica email único → cria registro com senha em hash → redireciona para login
- **Fluxo Alternativo:** Email já cadastrado → "E-mail já em uso. Tente fazer login."
- **Pós-condição:** Novo usuário no banco, redirecionado para login

### UC-02: Realizar Login
- **Ator:** Usuário final
- **Pré-condição:** Cadastro ativo
- **Fluxo Principal:** Informa email/senha → valida credenciais (BCrypt) → gera token JWT → redireciona para mapa (UC-04)
- **Fluxo Alternativo:** Credenciais inválidas → "E-mail ou senha incorretos" (sem indicar qual)
- **Pós-condição:** Sessão autenticada com acesso completo

### UC-03: Realizar Logout
- **Ator:** Usuário final
- **Pré-condição:** Autenticado
- **Fluxo Principal:** Clica "Sair" → remove JWT do frontend → invalida sessão no backend → redireciona para login
- **Pós-condição:** Sessão encerrada, token invalidado

### UC-04: Visualizar Mapa de Risco
- **Ator:** Usuário final
- **Pré-condição:** Autenticado, dados climáticos disponíveis
- **Fluxo Principal:** Acessa URL → carrega mapa Leaflet.js centrado em SP → GET /api/regioes com JWT → renderiza heatmap com gradiente → atualização automática a cada 15min
- **Fluxo Alternativo:** Não autenticado → login; Backend indisponível → cache + aviso
- **Pós-condição:** Mapa atualizado com heatmap em tempo real

### UC-05: Consultar Detalhes de Região
- **Ator:** Usuário final
- **Pré-condição:** UC-04 executado
- **Fluxo Principal:** Clica na região → GET /api/regioes/{id} com JWT → exibe score agregado + lista de subprefeituras ordenadas por score + variáveis climáticas + cores por faixa
- **Fluxo Alternativo:** Sem dados → "Dados não disponíveis para esta zona"
- **Pós-condição:** Detalhes climáticos visíveis

### UC-06: Visualizar Painel de Alertas
- **Ator:** Usuário final
- **Pré-condição:** Autenticado, dados processados
- **Fluxo Principal:** GET /api/regioes?ordenar=score → lista decrescente com nome/score/ícone → score > 60 exibe sugestão do catálogo → timestamp no topo
- **Fluxo Alternativo:** Nenhum risco elevado → "Nenhum alerta ativo no momento"
- **Pós-condição:** Usuário informado sobre zonas de risco

### UC-07: Coletar Dados Climáticos
- **Ator:** BackgroundService
- **Pré-condição:** DataCollectionJob em execução, API key configurada
- **Fluxo Principal:** Job dispara a cada 15min → obtém 32 subprefeituras ativas → para cada, chama OpenWeatherMap (lat/lon) → persiste leitura → dispara UC-08
- **Fluxo Alternativo:** Falha em uma subprefeitura → log de erro, mantém última leitura, prossegue para demais
- **Pós-condição:** Banco atualizado com leituras recentes

### UC-08: Calcular Score de Perigo
- **Ator:** BackgroundService
- **Pré-condição:** UC-07 executado
- **Fluxo Principal:** Recupera leituras recentes → normaliza variáveis [0,100] → aplica pesos (chuva 35%, vento 30%, neblina 20%, UV 15%) → persiste score por subprefeitura → classifica faixa → agrega por região (MAX) → score > 60: gera alerta + vincula sugestões
- **Fluxo Alternativo:** Variável ausente → valor 0 + log de aviso
- **Pós-condição:** Scores e alertas atualizados, disponíveis via API

### UC-09: Atualizar Heatmap
- **Ator:** Frontend (automático)
- **Pré-condição:** Autenticado, app aberta, dados atualizados
- **Fluxo Principal:** Timer 15min → GET /api/regioes com JWT → remove heatmap anterior → renderiza novo → atualiza painel + timestamp
- **Fluxo Alternativo:** Token expirado → login; Backend indisponível → mantém heatmap + aviso
- **Pós-condição:** Interface atualizada sem interrupção

### UC-10: Consultar Histórico Climático
- **Ator:** Usuário final
- **Pré-condição:** Autenticado, leituras disponíveis
- **Fluxo Principal:** Clica "Ver histórico" → GET /api/subprefeituras/{id}/historico?horas=24 → gráfico de linha Recharts com score e variáveis
- **Fluxo Alternativo:** Menos de 2 leituras → "Histórico insuficiente"
- **Pós-condição:** Evolução temporal visível

### UC-11: Gerenciar Regiões Favoritas
- **Ator:** Usuário final
- **Pré-condição:** Autenticado
- **Fluxo Principal:** Clica favoritar → POST /api/usuarios/{id}/favoritos → cria UsuarioRegiao → interface destaca região → favoritas no topo do painel
- **Fluxo Alternativo:** Região já favorita → DELETE → remove registro
- **Pós-condição:** Favoritos atualizados

---

## 4. HISTÓRICO DE VERSÕES

| Versão | Data | Autor | Descrição |
|---|---|---|---|
| 1.0 | Março/2026 | Gabriel Silva de Paula Leite | Versão inicial (Python/FastAPI) |
| 1.1 | Março/2026 | Gabriel Silva de Paula Leite | Migração para C#/ASP.NET Core |
| 2.0 | Maio/2026 | Gabriel Silva de Paula Leite | Subprefeituras, score agregado MAX, sugestões via catálogo, favoritos UC-11 |
