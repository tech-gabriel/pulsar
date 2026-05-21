# PULSAR — Contexto do Projeto

> Pulsar: O mapa vivo da sua segurança.

Aplicação web de monitoramento climático em tempo real para São Paulo.
Coleta dados das 32 subprefeituras, calcula Score de Perigo (0-100) e exibe mapa de risco com alertas.

## Stack

- **Backend:** C# / ASP.NET Core (.NET 10 LTS)
- **ORM:** Entity Framework Core + SQLite
- **Auth:** JWT + BCrypt
- **Frontend:** React + Tailwind CSS + Leaflet.js + Recharts
- **Icons:** Lucide React
- **API Externa:** OpenWeatherMap

## Estrutura da Solução

```
Pulsar/
├── Pulsar.sln
├── CLAUDE.md
├── .claude/skills/
├── Pulsar.API/              ← backend C# ASP.NET Core
│   ├── Controllers/
│   ├── Domain/Entities/
│   ├── Domain/Enums/
│   ├── Services/
│   ├── Repositories/Interfaces/
│   ├── Repositories/Data/  ← PulsarDbContext, Migrations
│   ├── Scheduler/
│   ├── External/Interfaces/
│   ├── External/Clients/
│   ├── DTOs/
│   └── Program.cs
├── Pulsar.Tests/            ← testes xUnit
└── pulsar-web/              ← frontend React
```

## Arquitetura

Padrões GRASP: Alta Coesão, Baixo Acoplamento, Especialista na Informação, Controller, Creator.
Todas as dependências são injetadas via DI container do ASP.NET Core.
Interfaces isolam dependências externas (IWeatherClient, IRepository<T>).

## Regras de Negócio Essenciais

**Score de Perigo (por subprefeitura):**
```
Score = (Chuva × 0.35) + (Vento × 0.30) + (Neblina × 0.20) + (UV × 0.15)
```
Cada variável normalizada para [0, 100]. Score final: Math.Clamp(0, 100).

**Score Agregado (por região):** MAX dos scores das subprefeituras ativas.

**Faixas:** Baixo 0-30 (verde), Moderado 31-60 (amarelo), Alto 61-100 (vermelho).

**5 regiões:** Centro (6 subpref.), Norte (6), Sul (6), Leste (11), Oeste (3).

## Banco de Dados — SQLite + EF Core (Code-First)

**Tabelas:** Usuario, Regiao, Subprefeitura, LeituraClimatica, ScorePerigo,
Alerta, Sugestao, UsuarioRegiao (N:N favoritos), AlertaSugestao (N:N).

**Regras:** Todas as entidades têm CriadoEm e AtualizadoEm automáticos.
Guid como PK. Histórico limitado a 24h por subprefeitura.

**Connection string:** em appsettings.json apontando para arquivo local .db.
**API Key OpenWeatherMap:** em User Secrets (NUNCA no código).

## Coleta de Dados

32 subprefeituras a cada 15min via BackgroundService.
~92.160 chamadas/mês (dentro do limite gratuito de 1M).
Falha parcial: manter última leitura, continuar para as demais.

## Convenções

- Commits: Conventional Commits em PT-BR (ver skill /git)
- Testes: Arrange-Act-Assert, naming [Método]_[Cenário]_[Resultado]
- Design System: ver skill /frontend para tokens completos
- Backend patterns: ver skill /backend para detalhes

## Plano de Desenvolvimento

### FASE 0 — Setup do Projeto e Banco de Dados
0.1. Criar estrutura de pastas do Pulsar.API (Domain/, Services/, etc.)
0.2. Instalar pacotes NuGet:
     - Microsoft.EntityFrameworkCore.Sqlite
     - Microsoft.EntityFrameworkCore.Design
     - Microsoft.EntityFrameworkCore.Tools
     - Microsoft.AspNetCore.Authentication.JwtBearer
     - BCrypt.Net-Next
0.3. Configurar connection string SQLite em appsettings.json
0.4. Configurar User Secrets para API key OpenWeatherMap
0.5. Criar entidades do Domain (todas as 9 classes + enum FaixaRisco)
0.6. Criar PulsarDbContext com DbSets, OnModelCreating (relacionamentos, índices, constraints)
0.7. Gerar migration inicial: dotnet ef migrations add InitialCreate
0.8. Aplicar migration: dotnet ef database update
0.9. Criar Seed Data (5 regiões + 32 subprefeituras com lat/lon reais + sugestões de segurança)
0.10. Registrar DbContext no DI container (Program.cs)
0.11. Testar: dotnet run deve iniciar sem erros e criar o arquivo .db

### FASE 1 — Motor do Sistema (Services + External)
1.1. Criar IWeatherClient + OpenWeatherMapClient
1.2. Implementar ClimateService (coleta por subprefeitura)
1.3. Implementar ScoreService (fórmula + normalização + agregação MAX)
1.4. Implementar SugestaoService (consulta catálogo por categoria/faixa)
1.5. Implementar AlertaService (gerar alertas + vincular sugestões)
1.6. Implementar DataCollectionJob (BackgroundService, ciclo 15min)
1.7. Registrar todos os services e interfaces no DI container

### FASE 2 — API REST (Controllers + Auth + DTOs)
2.1. Criar DTOs de resposta (RegiaoDto, SubprefeituraDto, ScoreDto, etc.)
2.2. Implementar AuthController (cadastro, login JWT, logout)
2.3. Implementar RegioesController (GET regiões, GET região/{id})
2.4. Implementar HistoricoController (GET histórico por subprefeitura)
2.5. Implementar FavoritosController (GET, POST, DELETE)
2.6. Configurar JWT no Program.cs
2.7. Configurar CORS para frontend
2.8. Configurar Swagger/OpenAPI

### FASE 3 — Testes do Backend
3.1. Criar projeto Pulsar.Tests (xUnit + Moq + FluentAssertions)
3.2. Testes do ScoreService (fórmula, normalização, limites, MAX)
3.3. Testes do AlertaService (geração, vinculação de sugestões)
3.4. Testes de integração dos Controllers (com SQLite in-memory)
3.5. Testes do DataCollectionJob (falha parcial, leituras inválidas)

### FASE 4 — Frontend (React + Leaflet + Tailwind)
4.1. Criar projeto React + instalar dependências (Tailwind, Leaflet, Recharts, Lucide)
4.2. Configurar Design System (tailwind.config.js com tokens do Pulsar)
4.3. Telas de Auth (cadastro, login)
4.4. Mapa interativo Leaflet.js centrado em SP
4.5. Heatmap dinâmico com 5 regiões coloridas por score
4.6. Painel lateral de alertas ordenado por score
4.7. Detalhes de região (subprefeituras + variáveis climáticas)
4.8. Gráfico de histórico Recharts (últimas 24h)
4.9. Sistema de favoritos na interface
4.10. Polling automático 15min sem reload

### FASE 5 — Polimento
5.1. Responsividade mobile-first (min 375px)
5.2. Testes frontend (Jest + React Testing Library)
5.3. Tratamento de erros e loading states
5.4. Documentação Swagger completa
