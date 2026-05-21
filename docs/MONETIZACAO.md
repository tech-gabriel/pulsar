# PULSAR | Estratégia de Monetização e Crescimento — v2.0

*Pulsar: O mapa vivo da sua segurança.* — São Paulo, SP - 2026

---

## 1. SUMÁRIO EXECUTIVO

O Pulsar é uma aplicação web de monitoramento climático em tempo real para São Paulo, com coleta de dados das 32 subprefeituras, Score de Perigo ponderado por região e painel de alertas com sugestões automáticas. Pesquisa com 23 moradores: 95,7% usariam a ferramenta, 100% consideram úteis as sugestões automáticas.

Quatro fontes de receita: Freemium B2C, API B2B, Dashboard Corporativo, Licenciamento Institucional.
Três fases: lançamento gratuito (meses 1-3), ativação de receita (meses 4-9), escala (meses 10-18).
Projeção: MRR R$ 15.000 a R$ 45.000 ao final do primeiro ano comercial.

---

## 2. ANÁLISE DE MERCADO

**TAM B2C em SP:** ~6,2 milhões de usuários potenciais (12M habitantes, 6,5M smartphones, 95,7% usariam).
**TAM B2B:** 500+ empresas potenciais em SP (logística, seguros, transporte, construção, eventos).

**Diferenciação competitiva:**

| Aspecto | Apps de Clima | AlertaSP | Pulsar |
|---|---|---|---|
| Granularidade | Por cidade | Por cidade | Por subprefeitura (32 pontos) |
| Score de risco | Não | Não | Score 0-100 ponderado |
| Heatmap visual | Não | Não | Sim, 3 faixas de cor |
| Sugestões | Não | SMS genéricos | Automáticas por categoria/faixa |
| Atualização | Horária | Sob demanda | A cada 15 minutos |
| API para empresas | Paga (alto custo) | Não | Sim (acessível) |
| Custo | Gratuito | Gratuito | Freemium |

---

## 3. MODELOS DE RECEITA

### 3.1 Freemium B2C (R$ 0 / R$ 9,90/mês)

| Funcionalidade | Gratuito | Premium |
|---|---|---|
| Mapa + heatmap | ✅ | ✅ |
| Score agregado | ✅ | ✅ |
| Alertas + sugestões | ✅ | ✅ |
| Score por subprefeitura | ❌ | ✅ |
| Alertas push | ❌ | ✅ Ilimitado |
| Histórico | 6 horas | 7 dias |
| Regiões favoritas | 1 | Ilimitadas |
| Múltiplas cidades | Só SP | Todas |
| Anúncios | Com | Sem |

Meta: 3-5% conversão. 10.000 ativos → 300-500 assinantes → R$2.970-4.950/mês.

### 3.2 API B2B

| Plano | Chamadas/dia | Preço |
|---|---|---|
| Starter | 1.000 | R$ 99/mês |
| Growth | 10.000 | R$ 499/mês |
| Enterprise | 100.000 | R$ 1.999/mês |

Clientes: iFood/Rappi/Loggi (delivery), Porto Seguro/SulAmérica (seguros), 99/Uber/CET (mobilidade), construtoras, produtoras de eventos.

### 3.3 Dashboard Corporativo

| Plano | Usuários | Preço |
|---|---|---|
| Equipe | 3 | R$ 299/mês |
| Business | 10 | R$ 699/mês |
| Enterprise | Ilimitados | R$ 1.499/mês |

### 3.4 Licenciamento Institucional

| Faixa | Preço |
|---|---|
| Cidades até 500 mil hab. | R$ 3.500/mês |
| Cidades 500 mil a 2 milhões | R$ 6.000/mês |
| Cidades acima de 2 milhões | R$ 12.000/mês |

---

## 4. ESTRATÉGIA DE CRESCIMENTO

### Fase 1 — Lançamento (Meses 1-6)
Meta: 10.000 usuários ativos em SP. Receita: R$ 0.
Estratégias: PWA, SEO local por região/subprefeitura, bot Twitter/X, grupos WhatsApp/Telegram, parcerias com influenciadores de mobilidade, cobertura jornalística.

### Fase 2 — Ativação de Receita (Meses 4-9)
Meta: MRR R$ 5.000-15.000.
Ativar Premium, lançar API B2B (Swagger + sandbox), widget embedável para portais de notícias, alertas push PWA.

### Fase 3 — Escala (Meses 10-24)
Meta: MRR R$ 15.000-45.000.
Expandir para RJ, BH, Recife, Porto Alegre. Dashboard corporativo. Piloto institucional (3 meses grátis → contrato anual). App nativo React Native.

---

## 5. VANTAGENS COMPETITIVAS

- **Granularidade única:** first-mover em score por subprefeitura em SP
- **Efeito de rede:** mais usuários → mais dados de comportamento → produto melhor
- **Lock-in de dados:** histórico acumulado se torna ativo valioso e difícil de replicar
- **Catálogo escalável:** sugestões por categoria/faixa sem alteração de código
- **Custo marginal ~zero:** nova cidade = INSERT no banco + chamadas adicionais à API

---

## 6. PRÓXIMOS PASSOS

1. Registrar domínio (pulsar.app.br)
2. Implementar MVP funcional (Projeto Integrador II)
3. Configurar PWA com Service Worker
4. Criar páginas SEO por região/subprefeitura
5. Preparar documentação API (Swagger/OpenAPI)
6. Validar pricing com 5 potenciais clientes B2B
7. Buscar aceleradoras (InovAtiva, Startup SP, Google for Startups)
