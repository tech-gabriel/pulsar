CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607031600_InitialCreate') THEN
    CREATE TABLE "Regioes" (
        "Id" uuid NOT NULL,
        "Nome" character varying(100) NOT NULL,
        "CriadoEm" timestamp with time zone NOT NULL,
        "AtualizadoEm" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Regioes" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607031600_InitialCreate') THEN
    CREATE TABLE "Sugestoes" (
        "Id" uuid NOT NULL,
        "Categoria" character varying(50) NOT NULL,
        "FaixaRisco" integer NOT NULL,
        "Titulo" character varying(200) NOT NULL,
        "Descricao" character varying(1000) NOT NULL,
        "Ativa" boolean NOT NULL,
        "CriadoEm" timestamp with time zone NOT NULL,
        "AtualizadoEm" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Sugestoes" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607031600_InitialCreate') THEN
    CREATE TABLE "Usuarios" (
        "Id" uuid NOT NULL,
        "Nome" character varying(200) NOT NULL,
        "Email" character varying(200) NOT NULL,
        "SenhaHash" text NOT NULL,
        "Perfil" integer NOT NULL,
        "CriadoEm" timestamp with time zone NOT NULL,
        "AtualizadoEm" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Usuarios" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607031600_InitialCreate') THEN
    CREATE TABLE "Subprefeituras" (
        "Id" uuid NOT NULL,
        "RegiaoId" uuid NOT NULL,
        "Nome" character varying(100) NOT NULL,
        "Latitude" double precision NOT NULL,
        "Longitude" double precision NOT NULL,
        "Ativa" boolean NOT NULL,
        "CriadoEm" timestamp with time zone NOT NULL,
        "AtualizadoEm" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Subprefeituras" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Subprefeituras_Regioes_RegiaoId" FOREIGN KEY ("RegiaoId") REFERENCES "Regioes" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607031600_InitialCreate') THEN
    CREATE TABLE "TokensRecuperacaoSenha" (
        "Id" uuid NOT NULL,
        "UsuarioId" uuid NOT NULL,
        "TokenHash" character varying(64) NOT NULL,
        "ExpiraEm" timestamp with time zone NOT NULL,
        "UsadoEm" timestamp with time zone,
        "CriadoEm" timestamp with time zone NOT NULL,
        "AtualizadoEm" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_TokensRecuperacaoSenha" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_TokensRecuperacaoSenha_Usuarios_UsuarioId" FOREIGN KEY ("UsuarioId") REFERENCES "Usuarios" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607031600_InitialCreate') THEN
    CREATE TABLE "UsuarioRegioes" (
        "Id" uuid NOT NULL,
        "UsuarioId" uuid NOT NULL,
        "RegiaoId" uuid NOT NULL,
        "CriadoEm" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_UsuarioRegioes" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_UsuarioRegioes_Regioes_RegiaoId" FOREIGN KEY ("RegiaoId") REFERENCES "Regioes" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_UsuarioRegioes_Usuarios_UsuarioId" FOREIGN KEY ("UsuarioId") REFERENCES "Usuarios" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607031600_InitialCreate') THEN
    CREATE TABLE "LeiturasClimaticas" (
        "Id" uuid NOT NULL,
        "SubprefeituraId" uuid NOT NULL,
        "ChuvaMmH" double precision NOT NULL,
        "VentoKmH" double precision NOT NULL,
        "VisibilidadeKm" double precision NOT NULL,
        "IndiceUv" double precision NOT NULL,
        "TemperaturaC" double precision NOT NULL,
        "SensacaoTermica" double precision NOT NULL,
        "Umidade" double precision NOT NULL,
        "Timestamp" timestamp with time zone NOT NULL,
        "CriadoEm" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_LeiturasClimaticas" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_LeiturasClimaticas_Subprefeituras_SubprefeituraId" FOREIGN KEY ("SubprefeituraId") REFERENCES "Subprefeituras" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607031600_InitialCreate') THEN
    CREATE TABLE "ScoresPerigo" (
        "Id" uuid NOT NULL,
        "SubprefeituraId" uuid NOT NULL,
        "LeituraId" uuid NOT NULL,
        "Valor" double precision NOT NULL,
        "Faixa" integer NOT NULL,
        "Timestamp" timestamp with time zone NOT NULL,
        "CriadoEm" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_ScoresPerigo" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_ScoresPerigo_LeiturasClimaticas_LeituraId" FOREIGN KEY ("LeituraId") REFERENCES "LeiturasClimaticas" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_ScoresPerigo_Subprefeituras_SubprefeituraId" FOREIGN KEY ("SubprefeituraId") REFERENCES "Subprefeituras" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607031600_InitialCreate') THEN
    CREATE TABLE "Alertas" (
        "Id" uuid NOT NULL,
        "RegiaoId" uuid NOT NULL,
        "ScoreId" uuid NOT NULL,
        "Mensagem" character varying(500) NOT NULL,
        "Timestamp" timestamp with time zone NOT NULL,
        "CriadoEm" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Alertas" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Alertas_Regioes_RegiaoId" FOREIGN KEY ("RegiaoId") REFERENCES "Regioes" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_Alertas_ScoresPerigo_ScoreId" FOREIGN KEY ("ScoreId") REFERENCES "ScoresPerigo" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607031600_InitialCreate') THEN
    CREATE TABLE "AlertaSugestoes" (
        "Id" uuid NOT NULL,
        "AlertaId" uuid NOT NULL,
        "SugestaoId" uuid NOT NULL,
        "Ordem" integer NOT NULL,
        CONSTRAINT "PK_AlertaSugestoes" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_AlertaSugestoes_Alertas_AlertaId" FOREIGN KEY ("AlertaId") REFERENCES "Alertas" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_AlertaSugestoes_Sugestoes_SugestaoId" FOREIGN KEY ("SugestaoId") REFERENCES "Sugestoes" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607031600_InitialCreate') THEN
    INSERT INTO "Regioes" ("Id", "AtualizadoEm", "CriadoEm", "Nome")
    VALUES ('10000000-0000-0000-0000-000000000001', TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Centro');
    INSERT INTO "Regioes" ("Id", "AtualizadoEm", "CriadoEm", "Nome")
    VALUES ('10000000-0000-0000-0000-000000000002', TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Leste');
    INSERT INTO "Regioes" ("Id", "AtualizadoEm", "CriadoEm", "Nome")
    VALUES ('10000000-0000-0000-0000-000000000003', TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Norte');
    INSERT INTO "Regioes" ("Id", "AtualizadoEm", "CriadoEm", "Nome")
    VALUES ('10000000-0000-0000-0000-000000000004', TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Oeste');
    INSERT INTO "Regioes" ("Id", "AtualizadoEm", "CriadoEm", "Nome")
    VALUES ('10000000-0000-0000-0000-000000000005', TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Sul');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607031600_InitialCreate') THEN
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000001', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'CHUVA', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Precipitação leve esperada. Carregue um guarda-chuva ao sair de casa para evitar surpresas.', 0, 'Chuva leve prevista');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000002', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'CHUVA', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Chuva moderada na região. Evite áreas historicamente alagáveis, reduza a velocidade ao dirigir e mantenha distância segura.', 1, 'Chuva moderada');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000003', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'CHUVA', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Chuva intensa com risco elevado de alagamentos e deslizamentos. Evite viadutos e marginais. Procure abrigo seguro e afaste-se de encostas.', 2, 'Chuva intensa — risco de alagamento');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000004', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'VENTO', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Ventos fracos. Condições normais de circulação. Nenhuma medida especial necessária.', 0, 'Vento fraco');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000005', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'VENTO', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Rajadas moderadas de vento. Atenção a objetos soltos em janelas e sacadas. Motoristas de veículos altos devem redobrar cuidado.', 1, 'Rajadas de vento');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000006', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'VENTO', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Ventos fortes com risco de queda de árvores, placas e estruturas. Evite áreas arborizadas e lugares abertos. Não fique próximo a construções.', 2, 'Ventos fortes — risco de queda');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000007', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'NEBLINA', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Visibilidade dentro dos padrões normais. Condições de trânsito sem restrições por neblina.', 0, 'Visibilidade boa');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000008', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'NEBLINA', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Neblina reduzindo visibilidade. Ative o farol baixo mesmo de dia, reduza a velocidade e aumente a distância do veículo à frente.', 1, 'Neblina leve');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000009', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'NEBLINA', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Neblina densa com visibilidade abaixo de 200m. Evite dirigir se possível. Se necessário, use faróis e pisca-alerta.', 2, 'Neblina densa — visibilidade crítica');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000010', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'UV', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Índice UV baixo. Proteção solar básica é recomendada, especialmente para pessoas de pele clara.', 0, 'Índice UV baixo');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000011', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'UV', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Use protetor solar FPS 30 ou superior. Evite exposição prolongada entre 10h e 16h. Utilize óculos de sol e chapéu.', 1, 'Índice UV moderado');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000012', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'UV', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Índice UV muito alto. Evite exposição ao sol entre 10h e 16h. Use protetor FPS 50+, roupas protetoras e procure a sombra.', 2, 'Índice UV elevado — proteção obrigatória');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000013', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'GERAL', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Condições climáticas dentro da normalidade. Aproveite o dia com cautela e mantenha-se informado sobre atualizações.', 0, 'Condições climáticas favoráveis');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000014', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'GERAL', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Condições climáticas requerem atenção. Mantenha-se informado e siga as orientações dos órgãos competentes. Evite exposição desnecessária.', 1, 'Atenção às condições climáticas');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000015', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'GERAL', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Alerta climático ativo na região. Siga as orientações da Defesa Civil, evite áreas de risco e mantenha crianças e idosos em local seguro.', 2, 'Alerta climático ativo');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000016', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'CHUVA', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Mantenha um guarda-chuva próximo. Chuviscos podem ocorrer sem aviso prévio, especialmente no final da tarde.', 0, 'Guarde o guarda-chuva acessível');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000017', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'CHUVA', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Mesmo com chuva fraca, verifique o estado de bueiros na sua rua e evite caminhar próximo a calçadas alagadas.', 0, 'Atenção a bueiros e valetas');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000018', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'CHUVA', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Verifique o histórico de alagamentos da sua rota antes de sair. Marginais, viadutos e pontos baixos são os primeiros a alagar.', 1, 'Evite áreas alagáveis');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000019', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'CHUVA', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Pista molhada aumenta a distância de frenagem em até 2x. Reduza a velocidade e mantenha distância segura do veículo à frente.', 1, 'Reduza a velocidade no trânsito');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000020', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'CHUVA', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Em áreas de encosta, saia imediatamente e dirija-se ao abrigo mais próximo. Ligue para a Defesa Civil: 199.', 2, 'Risco de deslizamento');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000021', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'CHUVA', TIMESTAMPTZ '2026-01-01T00:00:00Z', '30 cm de água em movimento podem derrubar um adulto e 60 cm podem arrastar um veículo. Nunca tente atravessar vias alagadas.', 2, 'Nunca atravesse enxurradas');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000022', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'VENTO', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Vento suave. Atividades ao ar livre podem ser realizadas normalmente. Boa condição para caminhadas e esportes externos.', 0, 'Condições favoráveis ao ar livre');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000023', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'VENTO', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Mesmo com vento fraco, objetos leves podem ser deslocados. Feche janelas e portas ao deixar o ambiente.', 0, 'Verifique janelas abertas');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000024', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'VENTO', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Recolha vasos, cadeiras e outros objetos de sacadas e áreas externas. Rajadas podem deslocar itens e causar acidentes.', 1, 'Proteja objetos em sacadas');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000025', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'VENTO', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Rajadas de vento podem abrir portas com força inesperada. Segure a maçaneta ao abrir portas externas.', 1, 'Cuidado ao abrir portas');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000026', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'VENTO', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Ventos fortes podem derrubar galhos e árvores inteiras. Mantenha-se longe de árvores, postes e coberturas improvisadas.', 2, 'Evite ficar sob árvores');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000027', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'VENTO', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Caminhões, ônibus e veículos altos têm risco de tombamento. Motoristas devem reduzir velocidade e evitar pistas elevadas.', 2, 'Risco para veículos altos');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000028', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'NEBLINA', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Visibilidade adequada para todas as atividades. Continue com as atividades normais com a atenção de sempre.', 0, 'Sem restrições de visibilidade');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000029', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'NEBLINA', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Em dias frios e úmidos, neblina leve pode surgir nas primeiras horas da manhã. Fique atento ao sair cedo.', 0, 'Neblina matinal pode ocorrer');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000030', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'NEBLINA', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Com neblina, o farol baixo melhora tanto sua visibilidade quanto a percepção dos outros motoristas. Nunca use farol alto — aumenta o ofuscamento.', 1, 'Use farol baixo obrigatório');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000031', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'NEBLINA', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Com visibilidade reduzida, aumente para pelo menos 4 segundos a distância do veículo à frente. Evite ultrapassagens.', 1, 'Aumente a distância segura');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000032', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'NEBLINA', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Se a visibilidade for inferior a 50m, pare o veículo em local seguro fora da pista e acione o pisca-alerta. Aguarde a neblina dissipar.', 2, 'Pare em local seguro se necessário');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000033', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'NEBLINA', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Com neblina densa, pedestres devem usar roupas claras ou refletivas e evitar caminhar em vias com tráfego de veículos.', 2, 'Pedestres: use roupas claras');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000034', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'UV', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Com índice UV baixo, um protetor solar FPS 15 já oferece proteção adequada para a maioria das pessoas em atividades ao ar livre.', 0, 'Protetor solar FPS 15 suficiente');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000035', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'UV', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Índice UV favorável para atividades ao ar livre. Aproveite mas lembre-se de se hidratar bem.', 0, 'Bom momento para atividades externas');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000036', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'UV', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Chapéu de aba larga e óculos com proteção UV são essenciais. Reaplicar protetor solar a cada 2 horas ou após suar.', 1, 'Use chapéu e óculos de sol');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000037', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'UV', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Crianças e idosos são mais sensíveis à radiação UV. Aplique protetor solar antes de sair e evite exposição direta nos horários de pico.', 1, 'Proteja crianças e idosos');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000038', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'UV', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Com UV elevado, a pele pode queimar em menos de 15 minutos de exposição sem proteção. Mantenha-se na sombra ou em ambientes internos.', 2, 'Risco de queimaduras em minutos');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000039', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'UV', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Além da proteção solar, beba pelo menos 2 litros de água por dia. Calor intenso combinado com UV alto aumenta risco de desidratação e insolação.', 2, 'Hidratação reforçada');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000040', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'GERAL', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Mesmo com baixo risco, acompanhe as atualizações do Pulsar a cada 15 minutos. Condições climáticas podem mudar rapidamente.', 0, 'Mantenha-se informado');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000041', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'GERAL', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Dia com baixo risco climático. Ótimo para atividades ao ar livre. Leve água e protetor solar como precaução básica.', 0, 'Bom dia para atividades externas');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000042', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'GERAL', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Antes de sair, verifique o score da sua região no Pulsar. Com risco moderado, prefira horários com menor intensidade climática.', 1, 'Planeje suas saídas com antecedência');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000043', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'GERAL', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Mantenha no carro: lanternas, cobertor, kit de primeiros socorros, carregador portátil e água. Em situações moderadas, a preparação faz a diferença.', 1, 'Kit de emergência no carro');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000044', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'GERAL', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Em situação de risco, ligue 199 (Defesa Civil) ou 193 (Bombeiros). Não espere a situação piorar para pedir ajuda.', 2, 'Ligue para a Defesa Civil');
    INSERT INTO "Sugestoes" ("Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo")
    VALUES ('30000000-0000-0000-0000-000000000045', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', 'GERAL', TIMESTAMPTZ '2026-01-01T00:00:00Z', 'Com alerta ativo, fique em local seguro. Se precisar sair, informe alguém sobre seu destino e rota. Prefira rotas conhecidas e seguras.', 2, 'Evite deslocamentos desnecessários');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607031600_InitialCreate') THEN
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000001', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.548359999999999, -46.639876000000001, 'Sé', '10000000-0000-0000-0000-000000000001');
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000002', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.563777999999999, -46.533800999999997, 'Aricanduva-Formosa-Carrão', '10000000-0000-0000-0000-000000000002');
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000003', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.584802, -46.400846999999999, 'Cidade Tiradentes', '10000000-0000-0000-0000-000000000002');
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000004', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.501366999999998, -46.488332, 'Ermelino Matarazzo', '10000000-0000-0000-0000-000000000002');
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000005', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.545071, -46.407617000000002, 'Guaianases', '10000000-0000-0000-0000-000000000002');
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000006', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.50628, -46.399180999999999, 'Itaim Paulista', '10000000-0000-0000-0000-000000000002');
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000007', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.559878999999999, -46.458407000000001, 'Itaquera', '10000000-0000-0000-0000-000000000002');
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000008', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.548745, -46.588138000000001, 'Mooca', '10000000-0000-0000-0000-000000000002');
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000009', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.521186, -46.516173999999999, 'Penha', '10000000-0000-0000-0000-000000000002');
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000010', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.60557, -46.509548000000002, 'Sapopemba', '10000000-0000-0000-0000-000000000002');
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000011', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.61355, -46.450006000000002, 'São Mateus', '10000000-0000-0000-0000-000000000002');
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000012', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.495421, -46.437505000000002, 'São Miguel Paulista', '10000000-0000-0000-0000-000000000002');
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000013', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.593596999999999, -46.558053999999998, 'Vila Prudente', '10000000-0000-0000-0000-000000000002');
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000014', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.476931, -46.664169000000001, 'Casa Verde-Limão-Cachoeirinha', '10000000-0000-0000-0000-000000000003');
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000015', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.461469000000001, -46.691465999999998, 'Freguesia-Brasilândia', '10000000-0000-0000-0000-000000000003');
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000016', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.422594, -46.587577000000003, 'Jaçanã-Tremembé', '10000000-0000-0000-0000-000000000003');
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000017', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.421113999999999, -46.773601999999997, 'Perus-Anhanguera', '10000000-0000-0000-0000-000000000003');
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000018', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.465171999999999, -46.736835999999997, 'Pirituba-Jaraguá', '10000000-0000-0000-0000-000000000003');
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000019', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.478587000000001, -46.627833000000003, 'Santana-Tucuruvi', '10000000-0000-0000-0000-000000000003');
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000020', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.504908, -46.585228000000001, 'Vila Maria-Vila Guilherme', '10000000-0000-0000-0000-000000000003');
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000021', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.585713999999999, -46.743287000000002, 'Butantã', '10000000-0000-0000-0000-000000000004');
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000022', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.528213999999998, -46.713954000000001, 'Lapa', '10000000-0000-0000-0000-000000000004');
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000023', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.573253000000001, -46.688825999999999, 'Pinheiros', '10000000-0000-0000-0000-000000000004');
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000024', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.645517000000002, -46.759993999999999, 'Campo Limpo', '10000000-0000-0000-0000-000000000005');
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000025', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.766676, -46.679802000000002, 'Capela do Socorro', '10000000-0000-0000-0000-000000000005');
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000026', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.693687000000001, -46.652667000000001, 'Cidade Ademar', '10000000-0000-0000-0000-000000000005');
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000027', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.619492000000001, -46.606712999999999, 'Ipiranga', '10000000-0000-0000-0000-000000000005');
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000028', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.650549999999999, -46.645907999999999, 'Jabaquara', '10000000-0000-0000-0000-000000000005');
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000029', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.701308000000001, -46.756118999999998, 'M''Boi Mirim', '10000000-0000-0000-0000-000000000005');
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000030', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.890827000000002, -46.711489999999998, 'Parelheiros', '10000000-0000-0000-0000-000000000005');
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000031', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.650098, -46.688771000000003, 'Santo Amaro', '10000000-0000-0000-0000-000000000005');
    INSERT INTO "Subprefeituras" ("Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId")
    VALUES ('20000000-0000-0000-0000-000000000032', TRUE, TIMESTAMPTZ '2026-01-01T00:00:00Z', TIMESTAMPTZ '2026-01-01T00:00:00Z', -23.599433999999999, -46.646222000000002, 'Vila Mariana', '10000000-0000-0000-0000-000000000005');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607031600_InitialCreate') THEN
    CREATE INDEX "IX_Alertas_RegiaoId" ON "Alertas" ("RegiaoId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607031600_InitialCreate') THEN
    CREATE INDEX "IX_Alertas_ScoreId" ON "Alertas" ("ScoreId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607031600_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_AlertaSugestoes_AlertaId_SugestaoId" ON "AlertaSugestoes" ("AlertaId", "SugestaoId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607031600_InitialCreate') THEN
    CREATE INDEX "IX_AlertaSugestoes_SugestaoId" ON "AlertaSugestoes" ("SugestaoId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607031600_InitialCreate') THEN
    CREATE INDEX "IX_LeiturasClimaticas_SubprefeituraId_Timestamp" ON "LeiturasClimaticas" ("SubprefeituraId", "Timestamp");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607031600_InitialCreate') THEN
    CREATE INDEX "IX_ScoresPerigo_LeituraId" ON "ScoresPerigo" ("LeituraId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607031600_InitialCreate') THEN
    CREATE INDEX "IX_ScoresPerigo_SubprefeituraId_Timestamp" ON "ScoresPerigo" ("SubprefeituraId", "Timestamp");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607031600_InitialCreate') THEN
    CREATE INDEX "IX_Subprefeituras_RegiaoId" ON "Subprefeituras" ("RegiaoId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607031600_InitialCreate') THEN
    CREATE INDEX "IX_Sugestoes_Categoria_FaixaRisco" ON "Sugestoes" ("Categoria", "FaixaRisco");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607031600_InitialCreate') THEN
    CREATE INDEX "IX_TokensRecuperacaoSenha_TokenHash" ON "TokensRecuperacaoSenha" ("TokenHash");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607031600_InitialCreate') THEN
    CREATE INDEX "IX_TokensRecuperacaoSenha_UsuarioId" ON "TokensRecuperacaoSenha" ("UsuarioId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607031600_InitialCreate') THEN
    CREATE INDEX "IX_UsuarioRegioes_RegiaoId" ON "UsuarioRegioes" ("RegiaoId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607031600_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_UsuarioRegioes_UsuarioId_RegiaoId" ON "UsuarioRegioes" ("UsuarioId", "RegiaoId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607031600_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_Usuarios_Email" ON "Usuarios" ("Email");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260607031600_InitialCreate') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260607031600_InitialCreate', '10.0.8');
    END IF;
END $EF$;
COMMIT;

