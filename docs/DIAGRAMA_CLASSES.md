# PULSAR | Diagrama de Classes — v2.0

**UNIVERSIDADE FEDERAL DE MATO GROSSO DO SUL** — Curso de Tecnologia da Informação

*Pulsar: O mapa vivo da sua segurança.* — São Paulo, SP - 2026

---

## 1. INTRODUÇÃO

Diagrama de Classes UML do sistema Pulsar, descrevendo entidades, atributos, métodos, relacionamentos e padrões de design.

---

## 2. ORGANIZAÇÃO DE PACOTES (GRASP - Alta Coesão)

- **Pulsar.Domain** — Entidades: Usuario, Regiao, Subprefeitura, LeituraClimatica, ScorePerigo, Alerta, Sugestao, UsuarioRegiao, AlertaSugestao
- **Pulsar.Services** — Lógica de negócio: ClimateService, ScoreService, AlertaService, SugestaoService
- **Pulsar.Controllers** — Camada HTTP: RegioesController, HistoricoController, FavoritosController
- **Pulsar.Repositories** — Persistência: LeituraRepository, ScoreRepository, SubprefeituraRepository, SugestaoRepository, AlertaRepository
- **Pulsar.Scheduler** — Automação: DataCollectionJob (herda BackgroundService)
- **Pulsar.External** — Integração externa: OpenWeatherMapClient

---

## 3. PADRÕES GRASP APLICADOS

- **Alta Coesão:** Cada classe possui responsabilidades específicas
- **Baixo Acoplamento:** Interfaces (IWeatherClient, IRepository<T>) isolam dependências
- **Especialista na Informação:** ScorePerigo.Calcular() na própria classe; Subprefeitura.GetUltimaLeitura() na Subprefeitura
- **Controller:** Controllers orquestram fluxos sem lógica de negócio
- **Creator:** ClimateService cria LeituraClimatica; ScoreService cria ScorePerigo

---

## 4. DETALHAMENTO DAS CLASSES

### 4.1 Pulsar.Domain

#### Usuario
| Atributo | Tipo | Descrição |
|---|---|---|
| Id | Guid | Identificador único |
| Nome | String | Nome completo |
| Email | String | E-mail único para autenticação |
| SenhaHash | String | Senha em hash BCrypt |
| Favoritos | IList\<UsuarioRegiao\> | Regiões favoritas |
| CriadoEm | DateTime | Data de criação |
| AtualizadoEm | DateTime | Última atualização |

#### Regiao
| Atributo | Tipo | Descrição |
|---|---|---|
| Id | Guid | Identificador único |
| Nome | String | Nome da região administrativa |
| Subprefeituras | IList\<Subprefeitura\> | Subprefeituras da região |
| Alertas | IList\<Alerta\> | Histórico de alertas |
| CriadoEm | DateTime | Data de criação |
| AtualizadoEm | DateTime | Última atualização |

| Método | Retorno | Descrição |
|---|---|---|
| GetScoreAgregado() | Double | MAX dos scores das subprefeituras |
| GetFaixaAgregada() | FaixaRisco | Faixa do score agregado |

#### Subprefeitura
| Atributo | Tipo | Descrição |
|---|---|---|
| Id | Guid | Identificador único |
| Regiao | Regiao | Região associada |
| Nome | String | Nome (ex: Sé, Mooca) |
| Latitude | Double | Latitude do ponto central |
| Longitude | Double | Longitude do ponto central |
| Ativa | Boolean | Permite desativar sem excluir |
| Leituras | IList\<LeituraClimatica\> | Histórico de leituras |
| Scores | IList\<ScorePerigo\> | Histórico de scores |
| CriadoEm | DateTime | Data de criação |
| AtualizadoEm | DateTime | Última atualização |

| Método | Retorno | Descrição |
|---|---|---|
| GetUltimaLeitura() | LeituraClimatica | Leitura mais recente |
| GetUltimoScore() | ScorePerigo | Score mais recente |
| GetHistorico(int horas) | IList\<LeituraClimatica\> | Leituras das últimas N horas |

#### LeituraClimatica
| Atributo | Tipo | Descrição |
|---|---|---|
| Id | Guid | Identificador único |
| Subprefeitura | Subprefeitura | Subprefeitura associada |
| ChuvaMmH | Double | Precipitação em mm/h |
| VentoKmH | Double | Velocidade do vento em km/h |
| VisibilidadeKm | Double | Visibilidade em km |
| IndiceUv | Double | Índice UV |
| Timestamp | DateTime | Momento da leitura |
| CriadoEm | DateTime | Data de criação |

| Método | Retorno | Descrição |
|---|---|---|
| IsValida() | bool | Valores dentro dos intervalos esperados |

#### ScorePerigo
| Atributo | Tipo | Descrição |
|---|---|---|
| Id | Guid | Identificador único |
| Subprefeitura | Subprefeitura | Subprefeitura associada |
| Leitura | LeituraClimatica | Leitura que originou o score |
| Valor | Double | Valor calculado (0-100) |
| Faixa | FaixaRisco | Enum: Baixo/Moderado/Alto |
| Timestamp | DateTime | Momento do cálculo |
| CriadoEm | DateTime | Data de criação |

| Método | Retorno | Descrição |
|---|---|---|
| Calcular(LeituraClimatica leitura) | Double | Fórmula: Chuva×0.35 + Vento×0.30 + Neblina×0.20 + UV×0.15 |
| ClassificarFaixa() | FaixaRisco | Baixo(0-30), Moderado(31-60), Alto(61-100) |

**Enum FaixaRisco:** `{ BAIXO, MODERADO, ALTO }`

#### Alerta
| Atributo | Tipo | Descrição |
|---|---|---|
| Id | Guid | Identificador único |
| Regiao | Regiao | Região associada |
| Score | ScorePerigo | Score que originou o alerta |
| Mensagem | String | Mensagem principal |
| AlertaSugestoes | IList\<AlertaSugestao\> | Sugestões vinculadas |
| Timestamp | DateTime | Momento da geração |
| CriadoEm | DateTime | Data de criação |

#### Sugestao
| Atributo | Tipo | Descrição |
|---|---|---|
| Id | Guid | Identificador único |
| Categoria | String | CHUVA, VENTO, NEBLINA, UV, GERAL |
| FaixaRisco | FaixaRisco | Faixa associada |
| Titulo | String | Título curto |
| Descricao | String | Texto completo da sugestão |
| Ativa | Boolean | Permite desativar sem excluir |
| CriadoEm | DateTime | Data de criação |
| AtualizadoEm | DateTime | Última atualização |

#### UsuarioRegiao (tabela associativa N:N - favoritos)
| Atributo | Tipo | Descrição |
|---|---|---|
| Id | Guid | Identificador único |
| Usuario | Usuario | Usuário que favoritou |
| Regiao | Regiao | Região favoritada |
| CriadoEm | DateTime | Data em que favoritou |

#### AlertaSugestao (tabela associativa N:N)
| Atributo | Tipo | Descrição |
|---|---|---|
| Id | Guid | Identificador único |
| Alerta | Alerta | Alerta associado |
| Sugestao | Sugestao | Sugestão associada |
| Ordem | Int | Ordem de exibição |

---

### 4.2 Pulsar.Services

#### ClimateService
| Método | Retorno | Descrição |
|---|---|---|
| ColetarDadosTodasSubprefeituras() | Task | Itera 32 subprefeituras ativas e coleta dados |
| ColetarDadosSubprefeitura(Subprefeitura sub) | Task\<LeituraClimatica\> | Consulta API com coordenadas e persiste leitura |

#### ScoreService
| Método | Retorno | Descrição |
|---|---|---|
| CalcularTodosScores() | Task | Recalcula score de todas as subprefeituras |
| CalcularScore(Subprefeitura sub) | Task\<ScorePerigo\> | Cria e persiste ScorePerigo |
| AgregarScoreRegiao(Regiao regiao) | Double | MAX dos scores das subprefeituras |
| NormalizarVariavel(double valor, double min, double max) | Double | Normaliza para [0, 100] |

#### AlertaService
| Método | Retorno | Descrição |
|---|---|---|
| GerarAlertas() | Task\<IList\<Alerta\>\> | Gera alertas para regiões com score > 60 |
| VincularSugestoes(Alerta alerta, FaixaRisco faixa) | Task | Consulta catálogo e vincula via AlertaSugestao |

#### SugestaoService
| Método | Retorno | Descrição |
|---|---|---|
| BuscarPorCategoriaEFaixa(String cat, FaixaRisco faixa) | Task\<IList\<Sugestao\>\> | Sugestões ativas por categoria e faixa |
| BuscarPorFaixa(FaixaRisco faixa) | Task\<IList\<Sugestao\>\> | Todas as sugestões ativas de uma faixa |

---

### 4.3 Pulsar.Controllers

#### RegioesController
- `GET /api/regioes` — scores agregados de todas as regiões
- `GET /api/regioes/{id}` — detalhes da região com subprefeituras e scores

#### HistoricoController
- `GET /api/subprefeituras/{id}/historico` — série temporal

#### FavoritosController
- `GET /api/usuarios/{id}/favoritos` — regiões favoritas
- `POST /api/usuarios/{id}/favoritos` — favoritar região
- `DELETE /api/usuarios/{id}/favoritos/{regiaoId}` — desfavoritar

---

### 4.4 Pulsar.External

#### IWeatherClient (Interface)
- `BuscarDados(double lat, double lon)` → Task\<DadosClimaticosDto\>

#### OpenWeatherMapClient (implements IWeatherClient)
- HttpClient injetado via IHttpClientFactory
- API key lida de appsettings/User Secrets
- Lança WeatherApiException em caso de falha

---

### 4.5 Pulsar.Scheduler

#### DataCollectionJob (herda BackgroundService)
- Intervalo configurável (padrão: 15min)
- `ExecuteAsync()` — orquestra coleta → cálculo de scores → geração de alertas em loop
- `StopAsync()` — cancela gracefully no shutdown

---

## 5. RELACIONAMENTOS E CARDINALIDADES

| Origem | Destino | Tipo | Cardinalidade |
|---|---|---|---|
| Regiao | Subprefeitura | Composição | 1 → 1..* |
| Subprefeitura | LeituraClimatica | Composição | 1 → 0..* |
| Subprefeitura | ScorePerigo | Composição | 1 → 0..* |
| LeituraClimatica | ScorePerigo | Associação | 1 → 1 |
| ScorePerigo | Alerta | Associação | 1 → 0..1 |
| Regiao | Alerta | Associação | 1 → 0..* |
| Usuario | UsuarioRegiao | Associação | 1 → 0..* |
| Regiao | UsuarioRegiao | Associação | 1 → 0..* |
| Alerta | AlertaSugestao | Associação | 1 → 1..* |
| Sugestao | AlertaSugestao | Associação | 1 → 0..* |
| ClimateService | IWeatherClient | Dependência (DI) | Resolvido pelo container |
| ClimateService | LeituraClimatica | Criação (Creator) | Cria instâncias |
| ScoreService | ScorePerigo | Criação (Creator) | Cria instâncias |

---

## 6. VALIDAÇÕES E REGRAS

- **Calcular():** Variáveis normalizadas [0,100], pesos aplicados, Math.Clamp(0,100)
- **AgregarScoreRegiao():** MAX das subprefeituras ativas, faixa do score agregado
- **IsValida():** ChuvaMmH >= 0, VentoKmH >= 0, VisibilidadeKm > 0, IndiceUv >= 0
- **VincularSugestoes():** Filtro por categoria + faixa + Ativa=true, ordem via AlertaSugestao
- **GetHistorico():** Limitado a 24h, ordem cronológica crescente

---

## 7. HISTÓRICO DE VERSÕES

| Versão | Data | Autor | Descrição |
|---|---|---|---|
| 1.0 | Março/2026 | Gabriel Silva de Paula Leite | Versão inicial (Python/FastAPI) |
| 1.1 | Março/2026 | Gabriel Silva de Paula Leite | Migração para C#/ASP.NET Core |
| 2.0 | Maio/2026 | Gabriel Silva de Paula Leite | Subprefeituras, catálogo de sugestões, favoritos, tabelas associativas, campos de auditoria |
