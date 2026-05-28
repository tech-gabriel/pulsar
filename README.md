# Pulsar

> O mapa vivo da sua segurança.

Pulsar é uma aplicação web de monitoramento climático em tempo real para a cidade de São Paulo. O sistema coleta dados meteorológicos das 32 subprefeituras a cada 15 minutos, calcula um **Score de Perigo** (0 a 100) para cada região e exibe um mapa interativo com alertas e sugestões de segurança.

![Licença Proprietária](https://img.shields.io/badge/licença-proprietária-red)
![.NET 10](https://img.shields.io/badge/.NET-10.0-512BD4)
![React 19](https://img.shields.io/badge/React-19-61DAFB)

---

## Funcionalidades

1. Mapa interativo de São Paulo com heatmap por nível de risco (baixo, moderado, alto)
2. Score de Perigo calculado a partir de chuva, vento, neblina e índice UV
3. Alertas automáticos com sugestões de segurança por região
4. Histórico climático das últimas 24 horas em gráficos
5. Sistema de autenticação com JWT (cadastro e login)
6. Favoritos por região para acompanhamento personalizado
7. Atualização automática dos dados a cada 15 minutos

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Backend | C# / ASP.NET Core (.NET 10) |
| Banco de dados | SQLite via Entity Framework Core |
| Autenticação | JWT + BCrypt |
| Frontend | React 19 + TypeScript |
| Estilização | Tailwind CSS v4 |
| Mapa | Leaflet.js + React Leaflet |
| Gráficos | Recharts |
| API Climática | OpenWeatherMap |

---

## Pré-requisitos

Antes de começar, instale as ferramentas abaixo na sua máquina:

1. [**.NET 10 SDK**](https://dotnet.microsoft.com/download/dotnet/10.0) — versão 10.0 ou superior
2. [**Node.js**](https://nodejs.org) — versão 20 ou superior (já inclui o npm)
3. [**Git**](https://git-scm.com) — para clonar o repositório
4. Uma **chave de API gratuita** do [OpenWeatherMap](https://openweathermap.org/api) — crie uma conta, acesse *API keys* e copie a chave padrão

> Para verificar se o .NET está instalado corretamente, abra o terminal e execute `dotnet --version`. O resultado deve ser `10.x.x` ou superior.

---

## Como Executar

### 1. Clone o repositório

Abra o terminal na pasta onde deseja guardar o projeto e execute:

```bash
git clone https://github.com/tech-gabriel/pulsar.git
cd pulsar
```

### 2. Configure as credenciais do backend

O projeto usa o sistema de **User Secrets** do .NET para guardar informações sensíveis fora do código. Dentro da pasta `Pulsar.API`, execute os dois comandos abaixo substituindo os valores indicados:

```bash
cd Pulsar.API

dotnet user-secrets set "OpenWeatherMap:ApiKey" "SUA_CHAVE_OPENWEATHERMAP_AQUI"
dotnet user-secrets set "Jwt:SecretKey" "uma-senha-longa-e-segura-qualquer-com-mais-de-32-caracteres"
```

> A chave JWT pode ser qualquer texto longo e aleatório. Ela é usada apenas para assinar os tokens de autenticação internamente.

### 3. Execute o backend

Ainda dentro da pasta `Pulsar.API`, execute:

```bash
dotnet run
```

Na primeira execução, o sistema cria automaticamente o banco de dados SQLite e insere os dados iniciais das 32 subprefeituras e das 5 regiões de São Paulo. Aguarde até aparecer a mensagem:

```
Now listening on: http://localhost:5245
```

> A documentação completa da API fica disponível em `http://localhost:5245/scalar` enquanto o backend estiver rodando.

### 4. Execute o frontend

Abra um **segundo terminal** na raiz do projeto e execute:

```bash
cd pulsar-web
npm install
npm run dev
```

Aguarde até aparecer:

```
Local: http://localhost:5173/
```

### 5. Acesse o sistema

Abra o navegador e acesse `http://localhost:5173`.

Na tela inicial, clique em **Criar conta** para se registrar. Após o cadastro, você será redirecionado automaticamente para o mapa.

---

## Executar os Testes

### Testes do backend (xUnit)

Na raiz do projeto, execute:

```bash
dotnet test
```

O resultado mostrará os 76 testes unitários e de integração do backend.

### Testes do frontend (Vitest)

Dentro da pasta `pulsar-web`, execute:

```bash
npm test
```

---

## Estrutura do Projeto

```
Pulsar/
├── Pulsar.API/          # Backend C# ASP.NET Core
│   ├── Controllers/     # Endpoints da API REST
│   ├── Domain/          # Entidades e enumerações
│   ├── Services/        # Lógica de negócio
│   ├── Repositories/    # Acesso ao banco de dados
│   ├── External/        # Integração com OpenWeatherMap
│   ├── Scheduler/       # Coleta automática a cada 15min
│   └── DTOs/            # Objetos de transferência de dados
├── Pulsar.Tests/        # Testes xUnit do backend
└── pulsar-web/          # Frontend React + TypeScript
    └── src/
        ├── components/  # Componentes reutilizáveis
        ├── pages/       # Telas da aplicação
        ├── hooks/       # Hooks personalizados
        └── services/    # Chamadas à API
```

---

## Licença

Este projeto está protegido por uma licença proprietária. Consulte o arquivo [LICENSE](LICENSE) para os termos completos.

© 2026 Gabriel Silva de Paula Leite. Todos os direitos reservados.
