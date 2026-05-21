using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Pulsar.API.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Regioes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Nome = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "TEXT", nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Regioes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Sugestoes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Categoria = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    FaixaRisco = table.Column<int>(type: "INTEGER", nullable: false),
                    Titulo = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Descricao = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false),
                    Ativa = table.Column<bool>(type: "INTEGER", nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "TEXT", nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sugestoes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Usuarios",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Nome = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    SenhaHash = table.Column<string>(type: "TEXT", nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "TEXT", nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Usuarios", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Subprefeituras",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    RegiaoId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Nome = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Latitude = table.Column<double>(type: "REAL", nullable: false),
                    Longitude = table.Column<double>(type: "REAL", nullable: false),
                    Ativa = table.Column<bool>(type: "INTEGER", nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "TEXT", nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Subprefeituras", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Subprefeituras_Regioes_RegiaoId",
                        column: x => x.RegiaoId,
                        principalTable: "Regioes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UsuarioRegioes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UsuarioId = table.Column<Guid>(type: "TEXT", nullable: false),
                    RegiaoId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UsuarioRegioes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UsuarioRegioes_Regioes_RegiaoId",
                        column: x => x.RegiaoId,
                        principalTable: "Regioes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UsuarioRegioes_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LeiturasClimaticas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    SubprefeituraId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ChuvaMmH = table.Column<double>(type: "REAL", nullable: false),
                    VentoKmH = table.Column<double>(type: "REAL", nullable: false),
                    VisibilidadeKm = table.Column<double>(type: "REAL", nullable: false),
                    IndiceUv = table.Column<double>(type: "REAL", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LeiturasClimaticas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LeiturasClimaticas_Subprefeituras_SubprefeituraId",
                        column: x => x.SubprefeituraId,
                        principalTable: "Subprefeituras",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ScoresPerigo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    SubprefeituraId = table.Column<Guid>(type: "TEXT", nullable: false),
                    LeituraId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Valor = table.Column<double>(type: "REAL", nullable: false),
                    Faixa = table.Column<int>(type: "INTEGER", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScoresPerigo", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ScoresPerigo_LeiturasClimaticas_LeituraId",
                        column: x => x.LeituraId,
                        principalTable: "LeiturasClimaticas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ScoresPerigo_Subprefeituras_SubprefeituraId",
                        column: x => x.SubprefeituraId,
                        principalTable: "Subprefeituras",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Alertas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    RegiaoId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ScoreId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Mensagem = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    Timestamp = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Alertas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Alertas_Regioes_RegiaoId",
                        column: x => x.RegiaoId,
                        principalTable: "Regioes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Alertas_ScoresPerigo_ScoreId",
                        column: x => x.ScoreId,
                        principalTable: "ScoresPerigo",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AlertaSugestoes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    AlertaId = table.Column<Guid>(type: "TEXT", nullable: false),
                    SugestaoId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Ordem = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AlertaSugestoes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AlertaSugestoes_Alertas_AlertaId",
                        column: x => x.AlertaId,
                        principalTable: "Alertas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AlertaSugestoes_Sugestoes_SugestaoId",
                        column: x => x.SugestaoId,
                        principalTable: "Sugestoes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "Regioes",
                columns: new[] { "Id", "AtualizadoEm", "CriadoEm", "Nome" },
                values: new object[,]
                {
                    { new Guid("10000000-0000-0000-0000-000000000001"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Centro" },
                    { new Guid("10000000-0000-0000-0000-000000000002"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Leste" },
                    { new Guid("10000000-0000-0000-0000-000000000003"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Norte" },
                    { new Guid("10000000-0000-0000-0000-000000000004"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Oeste" },
                    { new Guid("10000000-0000-0000-0000-000000000005"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Sul" }
                });

            migrationBuilder.InsertData(
                table: "Sugestoes",
                columns: new[] { "Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo" },
                values: new object[,]
                {
                    { new Guid("30000000-0000-0000-0000-000000000001"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "CHUVA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Precipitação leve esperada. Carregue um guarda-chuva ao sair de casa para evitar surpresas.", 0, "Chuva leve prevista" },
                    { new Guid("30000000-0000-0000-0000-000000000002"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "CHUVA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Chuva moderada na região. Evite áreas historicamente alagáveis, reduza a velocidade ao dirigir e mantenha distância segura.", 1, "Chuva moderada" },
                    { new Guid("30000000-0000-0000-0000-000000000003"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "CHUVA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Chuva intensa com risco elevado de alagamentos e deslizamentos. Evite viadutos e marginais. Procure abrigo seguro e afaste-se de encostas.", 2, "Chuva intensa — risco de alagamento" },
                    { new Guid("30000000-0000-0000-0000-000000000004"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "VENTO", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Ventos fracos. Condições normais de circulação. Nenhuma medida especial necessária.", 0, "Vento fraco" },
                    { new Guid("30000000-0000-0000-0000-000000000005"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "VENTO", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Rajadas moderadas de vento. Atenção a objetos soltos em janelas e sacadas. Motoristas de veículos altos devem redobrar cuidado.", 1, "Rajadas de vento" },
                    { new Guid("30000000-0000-0000-0000-000000000006"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "VENTO", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Ventos fortes com risco de queda de árvores, placas e estruturas. Evite áreas arborizadas e lugares abertos. Não fique próximo a construções.", 2, "Ventos fortes — risco de queda" },
                    { new Guid("30000000-0000-0000-0000-000000000007"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "NEBLINA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Visibilidade dentro dos padrões normais. Condições de trânsito sem restrições por neblina.", 0, "Visibilidade boa" },
                    { new Guid("30000000-0000-0000-0000-000000000008"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "NEBLINA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Neblina reduzindo visibilidade. Ative o farol baixo mesmo de dia, reduza a velocidade e aumente a distância do veículo à frente.", 1, "Neblina leve" },
                    { new Guid("30000000-0000-0000-0000-000000000009"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "NEBLINA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Neblina densa com visibilidade abaixo de 200m. Evite dirigir se possível. Se necessário, use faróis e pisca-alerta.", 2, "Neblina densa — visibilidade crítica" },
                    { new Guid("30000000-0000-0000-0000-000000000010"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "UV", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Índice UV baixo. Proteção solar básica é recomendada, especialmente para pessoas de pele clara.", 0, "Índice UV baixo" },
                    { new Guid("30000000-0000-0000-0000-000000000011"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "UV", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Use protetor solar FPS 30 ou superior. Evite exposição prolongada entre 10h e 16h. Utilize óculos de sol e chapéu.", 1, "Índice UV moderado" },
                    { new Guid("30000000-0000-0000-0000-000000000012"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "UV", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Índice UV muito alto. Evite exposição ao sol entre 10h e 16h. Use protetor FPS 50+, roupas protetoras e procure a sombra.", 2, "Índice UV elevado — proteção obrigatória" },
                    { new Guid("30000000-0000-0000-0000-000000000013"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "GERAL", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Condições climáticas dentro da normalidade. Aproveite o dia com cautela e mantenha-se informado sobre atualizações.", 0, "Condições climáticas favoráveis" },
                    { new Guid("30000000-0000-0000-0000-000000000014"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "GERAL", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Condições climáticas requerem atenção. Mantenha-se informado e siga as orientações dos órgãos competentes. Evite exposição desnecessária.", 1, "Atenção às condições climáticas" },
                    { new Guid("30000000-0000-0000-0000-000000000015"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "GERAL", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Alerta climático ativo na região. Siga as orientações da Defesa Civil, evite áreas de risco e mantenha crianças e idosos em local seguro.", 2, "Alerta climático ativo" },
                    { new Guid("30000000-0000-0000-0000-000000000016"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "CHUVA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Mantenha um guarda-chuva próximo. Chuviscos podem ocorrer sem aviso prévio, especialmente no final da tarde.", 0, "Guarde o guarda-chuva acessível" },
                    { new Guid("30000000-0000-0000-0000-000000000017"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "CHUVA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Mesmo com chuva fraca, verifique o estado de bueiros na sua rua e evite caminhar próximo a calçadas alagadas.", 0, "Atenção a bueiros e valetas" },
                    { new Guid("30000000-0000-0000-0000-000000000018"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "CHUVA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Verifique o histórico de alagamentos da sua rota antes de sair. Marginais, viadutos e pontos baixos são os primeiros a alagar.", 1, "Evite áreas alagáveis" },
                    { new Guid("30000000-0000-0000-0000-000000000019"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "CHUVA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Pista molhada aumenta a distância de frenagem em até 2x. Reduza a velocidade e mantenha distância segura do veículo à frente.", 1, "Reduza a velocidade no trânsito" },
                    { new Guid("30000000-0000-0000-0000-000000000020"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "CHUVA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Em áreas de encosta, saia imediatamente e dirija-se ao abrigo mais próximo. Ligue para a Defesa Civil: 199.", 2, "Risco de deslizamento" },
                    { new Guid("30000000-0000-0000-0000-000000000021"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "CHUVA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "30 cm de água em movimento podem derrubar um adulto e 60 cm podem arrastar um veículo. Nunca tente atravessar vias alagadas.", 2, "Nunca atravesse enxurradas" },
                    { new Guid("30000000-0000-0000-0000-000000000022"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "VENTO", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Vento suave. Atividades ao ar livre podem ser realizadas normalmente. Boa condição para caminhadas e esportes externos.", 0, "Condições favoráveis ao ar livre" },
                    { new Guid("30000000-0000-0000-0000-000000000023"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "VENTO", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Mesmo com vento fraco, objetos leves podem ser deslocados. Feche janelas e portas ao deixar o ambiente.", 0, "Verifique janelas abertas" },
                    { new Guid("30000000-0000-0000-0000-000000000024"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "VENTO", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Recolha vasos, cadeiras e outros objetos de sacadas e áreas externas. Rajadas podem deslocar itens e causar acidentes.", 1, "Proteja objetos em sacadas" },
                    { new Guid("30000000-0000-0000-0000-000000000025"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "VENTO", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Rajadas de vento podem abrir portas com força inesperada. Segure a maçaneta ao abrir portas externas.", 1, "Cuidado ao abrir portas" },
                    { new Guid("30000000-0000-0000-0000-000000000026"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "VENTO", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Ventos fortes podem derrubar galhos e árvores inteiras. Mantenha-se longe de árvores, postes e coberturas improvisadas.", 2, "Evite ficar sob árvores" },
                    { new Guid("30000000-0000-0000-0000-000000000027"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "VENTO", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Caminhões, ônibus e veículos altos têm risco de tombamento. Motoristas devem reduzir velocidade e evitar pistas elevadas.", 2, "Risco para veículos altos" },
                    { new Guid("30000000-0000-0000-0000-000000000028"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "NEBLINA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Visibilidade adequada para todas as atividades. Continue com as atividades normais com a atenção de sempre.", 0, "Sem restrições de visibilidade" },
                    { new Guid("30000000-0000-0000-0000-000000000029"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "NEBLINA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Em dias frios e úmidos, neblina leve pode surgir nas primeiras horas da manhã. Fique atento ao sair cedo.", 0, "Neblina matinal pode ocorrer" },
                    { new Guid("30000000-0000-0000-0000-000000000030"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "NEBLINA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Com neblina, o farol baixo melhora tanto sua visibilidade quanto a percepção dos outros motoristas. Nunca use farol alto — aumenta o ofuscamento.", 1, "Use farol baixo obrigatório" },
                    { new Guid("30000000-0000-0000-0000-000000000031"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "NEBLINA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Com visibilidade reduzida, aumente para pelo menos 4 segundos a distância do veículo à frente. Evite ultrapassagens.", 1, "Aumente a distância segura" },
                    { new Guid("30000000-0000-0000-0000-000000000032"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "NEBLINA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Se a visibilidade for inferior a 50m, pare o veículo em local seguro fora da pista e acione o pisca-alerta. Aguarde a neblina dissipar.", 2, "Pare em local seguro se necessário" },
                    { new Guid("30000000-0000-0000-0000-000000000033"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "NEBLINA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Com neblina densa, pedestres devem usar roupas claras ou refletivas e evitar caminhar em vias com tráfego de veículos.", 2, "Pedestres: use roupas claras" },
                    { new Guid("30000000-0000-0000-0000-000000000034"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "UV", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Com índice UV baixo, um protetor solar FPS 15 já oferece proteção adequada para a maioria das pessoas em atividades ao ar livre.", 0, "Protetor solar FPS 15 suficiente" },
                    { new Guid("30000000-0000-0000-0000-000000000035"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "UV", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Índice UV favorável para atividades ao ar livre. Aproveite mas lembre-se de se hidratar bem.", 0, "Bom momento para atividades externas" },
                    { new Guid("30000000-0000-0000-0000-000000000036"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "UV", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Chapéu de aba larga e óculos com proteção UV são essenciais. Reaplicar protetor solar a cada 2 horas ou após suar.", 1, "Use chapéu e óculos de sol" },
                    { new Guid("30000000-0000-0000-0000-000000000037"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "UV", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Crianças e idosos são mais sensíveis à radiação UV. Aplique protetor solar antes de sair e evite exposição direta nos horários de pico.", 1, "Proteja crianças e idosos" },
                    { new Guid("30000000-0000-0000-0000-000000000038"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "UV", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Com UV elevado, a pele pode queimar em menos de 15 minutos de exposição sem proteção. Mantenha-se na sombra ou em ambientes internos.", 2, "Risco de queimaduras em minutos" },
                    { new Guid("30000000-0000-0000-0000-000000000039"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "UV", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Além da proteção solar, beba pelo menos 2 litros de água por dia. Calor intenso combinado com UV alto aumenta risco de desidratação e insolação.", 2, "Hidratação reforçada" },
                    { new Guid("30000000-0000-0000-0000-000000000040"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "GERAL", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Mesmo com baixo risco, acompanhe as atualizações do Pulsar a cada 15 minutos. Condições climáticas podem mudar rapidamente.", 0, "Mantenha-se informado" },
                    { new Guid("30000000-0000-0000-0000-000000000041"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "GERAL", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Dia com baixo risco climático. Ótimo para atividades ao ar livre. Leve água e protetor solar como precaução básica.", 0, "Bom dia para atividades externas" },
                    { new Guid("30000000-0000-0000-0000-000000000042"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "GERAL", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Antes de sair, verifique o score da sua região no Pulsar. Com risco moderado, prefira horários com menor intensidade climática.", 1, "Planeje suas saídas com antecedência" },
                    { new Guid("30000000-0000-0000-0000-000000000043"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "GERAL", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Mantenha no carro: lanternas, cobertor, kit de primeiros socorros, carregador portátil e água. Em situações moderadas, a preparação faz a diferença.", 1, "Kit de emergência no carro" },
                    { new Guid("30000000-0000-0000-0000-000000000044"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "GERAL", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Em situação de risco, ligue 199 (Defesa Civil) ou 193 (Bombeiros). Não espere a situação piorar para pedir ajuda.", 2, "Ligue para a Defesa Civil" },
                    { new Guid("30000000-0000-0000-0000-000000000045"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "GERAL", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Com alerta ativo, fique em local seguro. Se precisar sair, informe alguém sobre seu destino e rota. Prefira rotas conhecidas e seguras.", 2, "Evite deslocamentos desnecessários" }
                });

            migrationBuilder.InsertData(
                table: "Subprefeituras",
                columns: new[] { "Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId" },
                values: new object[,]
                {
                    { new Guid("20000000-0000-0000-0000-000000000001"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.548359999999999, -46.639876000000001, "Sé", new Guid("10000000-0000-0000-0000-000000000001") },
                    { new Guid("20000000-0000-0000-0000-000000000002"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.563777999999999, -46.533800999999997, "Aricanduva-Formosa-Carrão", new Guid("10000000-0000-0000-0000-000000000002") },
                    { new Guid("20000000-0000-0000-0000-000000000003"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.584802, -46.400846999999999, "Cidade Tiradentes", new Guid("10000000-0000-0000-0000-000000000002") },
                    { new Guid("20000000-0000-0000-0000-000000000004"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.501366999999998, -46.488332, "Ermelino Matarazzo", new Guid("10000000-0000-0000-0000-000000000002") },
                    { new Guid("20000000-0000-0000-0000-000000000005"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.545071, -46.407617000000002, "Guaianases", new Guid("10000000-0000-0000-0000-000000000002") },
                    { new Guid("20000000-0000-0000-0000-000000000006"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.50628, -46.399180999999999, "Itaim Paulista", new Guid("10000000-0000-0000-0000-000000000002") },
                    { new Guid("20000000-0000-0000-0000-000000000007"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.559878999999999, -46.458407000000001, "Itaquera", new Guid("10000000-0000-0000-0000-000000000002") },
                    { new Guid("20000000-0000-0000-0000-000000000008"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.548745, -46.588138000000001, "Mooca", new Guid("10000000-0000-0000-0000-000000000002") },
                    { new Guid("20000000-0000-0000-0000-000000000009"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.521186, -46.516173999999999, "Penha", new Guid("10000000-0000-0000-0000-000000000002") },
                    { new Guid("20000000-0000-0000-0000-000000000010"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.60557, -46.509548000000002, "Sapopemba", new Guid("10000000-0000-0000-0000-000000000002") },
                    { new Guid("20000000-0000-0000-0000-000000000011"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.61355, -46.450006000000002, "São Mateus", new Guid("10000000-0000-0000-0000-000000000002") },
                    { new Guid("20000000-0000-0000-0000-000000000012"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.495421, -46.437505000000002, "São Miguel Paulista", new Guid("10000000-0000-0000-0000-000000000002") },
                    { new Guid("20000000-0000-0000-0000-000000000013"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.593596999999999, -46.558053999999998, "Vila Prudente", new Guid("10000000-0000-0000-0000-000000000002") },
                    { new Guid("20000000-0000-0000-0000-000000000014"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.476931, -46.664169000000001, "Casa Verde-Limão-Cachoeirinha", new Guid("10000000-0000-0000-0000-000000000003") },
                    { new Guid("20000000-0000-0000-0000-000000000015"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.461469000000001, -46.691465999999998, "Freguesia-Brasilândia", new Guid("10000000-0000-0000-0000-000000000003") },
                    { new Guid("20000000-0000-0000-0000-000000000016"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.422594, -46.587577000000003, "Jaçanã-Tremembé", new Guid("10000000-0000-0000-0000-000000000003") },
                    { new Guid("20000000-0000-0000-0000-000000000017"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.421113999999999, -46.773601999999997, "Perus-Anhanguera", new Guid("10000000-0000-0000-0000-000000000003") },
                    { new Guid("20000000-0000-0000-0000-000000000018"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.465171999999999, -46.736835999999997, "Pirituba-Jaraguá", new Guid("10000000-0000-0000-0000-000000000003") },
                    { new Guid("20000000-0000-0000-0000-000000000019"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.478587000000001, -46.627833000000003, "Santana-Tucuruvi", new Guid("10000000-0000-0000-0000-000000000003") },
                    { new Guid("20000000-0000-0000-0000-000000000020"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.504908, -46.585228000000001, "Vila Maria-Vila Guilherme", new Guid("10000000-0000-0000-0000-000000000003") },
                    { new Guid("20000000-0000-0000-0000-000000000021"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.585713999999999, -46.743287000000002, "Butantã", new Guid("10000000-0000-0000-0000-000000000004") },
                    { new Guid("20000000-0000-0000-0000-000000000022"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.528213999999998, -46.713954000000001, "Lapa", new Guid("10000000-0000-0000-0000-000000000004") },
                    { new Guid("20000000-0000-0000-0000-000000000023"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.573253000000001, -46.688825999999999, "Pinheiros", new Guid("10000000-0000-0000-0000-000000000004") },
                    { new Guid("20000000-0000-0000-0000-000000000024"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.645517000000002, -46.759993999999999, "Campo Limpo", new Guid("10000000-0000-0000-0000-000000000005") },
                    { new Guid("20000000-0000-0000-0000-000000000025"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.766676, -46.679802000000002, "Capela do Socorro", new Guid("10000000-0000-0000-0000-000000000005") },
                    { new Guid("20000000-0000-0000-0000-000000000026"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.693687000000001, -46.652667000000001, "Cidade Ademar", new Guid("10000000-0000-0000-0000-000000000005") },
                    { new Guid("20000000-0000-0000-0000-000000000027"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.619492000000001, -46.606712999999999, "Ipiranga", new Guid("10000000-0000-0000-0000-000000000005") },
                    { new Guid("20000000-0000-0000-0000-000000000028"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.650549999999999, -46.645907999999999, "Jabaquara", new Guid("10000000-0000-0000-0000-000000000005") },
                    { new Guid("20000000-0000-0000-0000-000000000029"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.701308000000001, -46.756118999999998, "M'Boi Mirim", new Guid("10000000-0000-0000-0000-000000000005") },
                    { new Guid("20000000-0000-0000-0000-000000000030"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.890827000000002, -46.711489999999998, "Parelheiros", new Guid("10000000-0000-0000-0000-000000000005") },
                    { new Guid("20000000-0000-0000-0000-000000000031"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.650098, -46.688771000000003, "Santo Amaro", new Guid("10000000-0000-0000-0000-000000000005") },
                    { new Guid("20000000-0000-0000-0000-000000000032"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.599433999999999, -46.646222000000002, "Vila Mariana", new Guid("10000000-0000-0000-0000-000000000005") }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Alertas_RegiaoId",
                table: "Alertas",
                column: "RegiaoId");

            migrationBuilder.CreateIndex(
                name: "IX_Alertas_ScoreId",
                table: "Alertas",
                column: "ScoreId");

            migrationBuilder.CreateIndex(
                name: "IX_AlertaSugestoes_AlertaId_SugestaoId",
                table: "AlertaSugestoes",
                columns: new[] { "AlertaId", "SugestaoId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AlertaSugestoes_SugestaoId",
                table: "AlertaSugestoes",
                column: "SugestaoId");

            migrationBuilder.CreateIndex(
                name: "IX_LeiturasClimaticas_SubprefeituraId_Timestamp",
                table: "LeiturasClimaticas",
                columns: new[] { "SubprefeituraId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_ScoresPerigo_LeituraId",
                table: "ScoresPerigo",
                column: "LeituraId");

            migrationBuilder.CreateIndex(
                name: "IX_ScoresPerigo_SubprefeituraId_Timestamp",
                table: "ScoresPerigo",
                columns: new[] { "SubprefeituraId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_Subprefeituras_RegiaoId",
                table: "Subprefeituras",
                column: "RegiaoId");

            migrationBuilder.CreateIndex(
                name: "IX_Sugestoes_Categoria_FaixaRisco",
                table: "Sugestoes",
                columns: new[] { "Categoria", "FaixaRisco" });

            migrationBuilder.CreateIndex(
                name: "IX_UsuarioRegioes_RegiaoId",
                table: "UsuarioRegioes",
                column: "RegiaoId");

            migrationBuilder.CreateIndex(
                name: "IX_UsuarioRegioes_UsuarioId_RegiaoId",
                table: "UsuarioRegioes",
                columns: new[] { "UsuarioId", "RegiaoId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Usuarios_Email",
                table: "Usuarios",
                column: "Email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AlertaSugestoes");

            migrationBuilder.DropTable(
                name: "UsuarioRegioes");

            migrationBuilder.DropTable(
                name: "Alertas");

            migrationBuilder.DropTable(
                name: "Sugestoes");

            migrationBuilder.DropTable(
                name: "Usuarios");

            migrationBuilder.DropTable(
                name: "ScoresPerigo");

            migrationBuilder.DropTable(
                name: "LeiturasClimaticas");

            migrationBuilder.DropTable(
                name: "Subprefeituras");

            migrationBuilder.DropTable(
                name: "Regioes");
        }
    }
}
