# PULSAR | Especificação de Requisitos — v2.0

**UNIVERSIDADE FEDERAL DE MATO GROSSO DO SUL** — Curso de Tecnologia da Informação

*Pulsar: O mapa vivo da sua segurança.* — São Paulo, SP - 2026

---

## 1. INTRODUÇÃO

Este documento apresenta a especificação de requisitos do sistema Pulsar, uma aplicação web que monitora condições meteorológicas em tempo real na cidade de São Paulo - SP, coletando dados das 32 subprefeituras da cidade e gerando um mapa dinâmico de risco com Score de Perigo por subprefeitura e região.

### 1.1 Propósito
Definir os requisitos funcionais e não funcionais do sistema, servindo como base para o desenvolvimento, testes e validação do MVP.

### 1.2 Escopo do Sistema
- Mapa interativo com heatmap de risco climático por região, dados coletados por subprefeitura.
- Integração com API OpenWeatherMap com atualização periódica para as 32 subprefeituras.
- Cálculo de Score de Perigo (0-100) por subprefeitura, com agregação por região (MAX).
- Painel lateral com alertas e sugestões automáticas via catálogo configurável.
- Funcionalidade de regiões favoritas do usuário.
- Backend em C# (ASP.NET Core) e frontend em React com Leaflet.js.

### 1.3 Definições e Siglas
- **MVP:** Produto Mínimo Viável
- **Score de Perigo:** Índice 0-100 de risco climático por subprefeitura
- **Score agregado:** MAX dos scores das subprefeituras de uma região
- **Subprefeitura:** Divisão administrativa de SP (32 agrupadas em 5 regiões)
- **Heatmap:** Mapa de calor com gradiente de cores
- **Polling:** Consulta periódica a uma fonte de dados
- **EF Core:** Entity Framework Core – ORM da Microsoft
- **JWT:** JSON Web Token – autenticação stateless
- **Catálogo de sugestões:** Tabela no banco com sugestões por categoria e faixa de risco

---

## 2. VISÃO GERAL DO SISTEMA

Aplicação web focada em segurança pública. Coleta dados climáticos em tempo real das 32 subprefeituras, processa chuva, vento, neblina e UV, exibe mapa dinâmico com regiões coloridas por nível de risco. Score agregado = MAX das subprefeituras (abordagem conservadora).

**Público-Alvo:** Moradores de SP, condutores, responsáveis por crianças/idosos, profissionais de segurança pública e defesa civil.

**Benefícios:** Visualização intuitiva, atualizações automáticas, alertas preventivos, controle de acessos.

---

## 3. REQUISITOS FUNCIONAIS

| ID | Tipo | Descrição | Prioridade |
|---|---|---|---|
| RF-01 | Autenticação | Cadastro com nome, e-mail e senha | Alta |
| RF-02 | Autenticação | Login com e-mail/senha gerando token JWT | Alta |
| RF-03 | Autenticação | Logout encerrando sessão e invalidando JWT | Alta |
| RF-04 | Autenticação | Validar e-mail único no cadastro | Alta |
| RF-05 | Mapa | Mapa interativo de SP com zoom, pan e seleção | Alta |
| RF-06 | Mapa | Heatmap dinâmico com cores por Score agregado (verde 0-30 / amarelo 31-60 / vermelho 61-100) | Alta |
| RF-07 | Mapa | Atualizar heatmap a cada 15min sem recarregar página | Alta |
| RF-08 | Mapa | Marcadores em regiões com Score > 60, indicando tipo de risco | Média |
| RF-09 | Dados | Integrar OpenWeatherMap para 32 subprefeituras (chuva, vento, neblina, UV) | Alta |
| RF-10 | Dados | Armazenar histórico de 24h por subprefeitura | Média |
| RF-11 | Score | Calcular Score (0-100) por subprefeitura com fórmula ponderada | Alta |
| RF-12 | Score | Agregar Score por região = MAX das subprefeituras. Recalcular a cada ciclo | Alta |
| RF-13 | Painel | Painel lateral com regiões ordenadas por Score (maior → menor) | Alta |
| RF-14 | Painel | Sugestões automáticas do catálogo por categoria e faixa de risco | Média |
| RF-15 | Painel | Exibir data/hora da última atualização | Alta |
| RF-16 | Painel | Clicar em região para ver detalhes (variáveis + scores das subprefeituras) | Média |
| RF-17 | API | Endpoint REST com scores agregados de todas as regiões + subprefeituras | Alta |
| RF-18 | API | Endpoint REST com histórico climático por subprefeitura e período | Baixa |
| RF-19 | Favoritos | Favoritar/desfavoritar regiões (N:N via tabela associativa) | Média |
| RF-20 | Sugestões | Catálogo de sugestões filtrável por categoria (CHUVA, VENTO, NEBLINA, UV, GERAL) e faixa (BAIXO, MODERADO, ALTO) | Média |

---

## 4. REQUISITOS NÃO FUNCIONAIS

| ID | Categoria | Descrição |
|---|---|---|
| RNF-01 | Desempenho | Carregamento do mapa em ≤ 5s (10 Mbps) |
| RNF-02 | Desempenho | Atualização do heatmap sem recarregamento visível |
| RNF-03 | Disponibilidade | Funcional em falha da OpenWeatherMap (dados mais recentes) |
| RNF-04 | Usabilidade | Responsivo mobile-first (min 375px), painel como overlay em mobile |
| RNF-05 | Usabilidade | Cores padronizadas e legendas acessíveis |
| RNF-06 | Segurança | API key em variáveis de ambiente, nunca no frontend |
| RNF-07 | Manutenibilidade | Estrutura de namespaces documentada, comentários nas funções principais |
| RNF-08 | Portabilidade | Chrome, Firefox e Edge (versões estáveis) |
| RNF-09 | Escalabilidade | Adicionar cidades/regiões com INSERT no banco |
| RNF-10 | Tecnologia | Backend: C# ASP.NET Core; Frontend: React + Tailwind + Leaflet.js |
| RNF-11 | Manutenibilidade | Campos CriadoEm e AtualizadoEm automáticos em todas as tabelas |

---

## 5. REGRAS DE NEGÓCIO

### 5.1 Fórmula do Score de Perigo
```
Score = (Chuva × 0,35) + (Vento × 0,30) + (Neblina × 0,20) + (UV × 0,15)
```
Normalização para [0, 100]:
- **Chuva:** 0 mm/h = 0; ≥50 mm/h = 100 (linear)
- **Vento:** 0 km/h = 0; ≥80 km/h = 100 (linear)
- **Neblina:** >10 km = 0; <0.2 km = 100 (escala inversa)
- **UV:** 0 = 0; ≥11 = 100 (linear)

### 5.2 Score Agregado por Região
MAX dos scores das subprefeituras ativas. Abordagem conservadora.

### 5.3 Faixas de Risco
- **0-30 Baixo:** verde, sem alertas
- **31-60 Moderado:** amarelo, sugestões preventivas
- **61-100 Alto:** vermelho, alertas ativos com marcador

### 5.4 Frequência de Atualização
A cada 15min via BackgroundService. 32 chamadas/ciclo ≈ 92.160/mês (9,2% do limite gratuito). Falha parcial: manter última leitura, continuar para demais.

### 5.5 Regiões Monitoradas

| Região | Subprefeituras | Total |
|---|---|---|
| Centro | Sé, Mooca, Lapa, Pinheiros, Vila Mariana, Butantã | 6 |
| Norte | Santana/Tucuruvi, Casa Verde/Cachoeirinha, Freguesia/Brasilândia, Pirituba/Jaraguá, Perus, Tremembé/Jacanã | 6 |
| Sul | Santo Amaro, Campo Limpo, Capela do Socorro, Cidade Ademar, M'Boi Mirim, Parelheiros | 6 |
| Leste | Aricanduva, Cidade Tiradentes, Ermelino Matarazzo, Guaianases, Itaim Paulista, Itaquera, Penha, São Mateus, São Miguel Paulista, Sapopemba, Vila Prudente | 11 |
| Oeste | Ipiranga | 3 |

### 5.6 Catálogo de Sugestões
Tabela Sugestao com Categoria (CHUVA, VENTO, NEBLINA, UV, GERAL), FaixaRisco (BAIXO, MODERADO, ALTO) e Ativa (bool). Vinculação ao alerta via AlertaSugestao.

---

## 6. RESTRIÇÕES DO PROJETO
- Sem previsão futura, apenas monitoramento atual
- OpenWeatherMap: 60 chamadas/min, 1M/mês (consumo ~9,2%)
- Histórico limitado a 24h por subprefeitura
- MVP acadêmico sem SLA de produção
- Heatmap por região; visualização por subprefeitura em versões futuras

---

## 7. HISTÓRICO DE VERSÕES

| Versão | Data | Autor | Descrição |
|---|---|---|---|
| 1.0 | Março/2026 | Gabriel Silva de Paula Leite | Versão inicial (Python/FastAPI) |
| 1.1 | Março/2026 | Gabriel Silva de Paula Leite | Migração para C#/ASP.NET Core |
| 2.0 | Maio/2026 | Gabriel Silva de Paula Leite | Subprefeituras (32 pontos), score agregado MAX, catálogo de sugestões, favoritos, campos de auditoria |
