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
                    { new Guid("10000000-0000-0000-0000-000000000002"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Norte" },
                    { new Guid("10000000-0000-0000-0000-000000000003"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Sul" },
                    { new Guid("10000000-0000-0000-0000-000000000004"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Leste" },
                    { new Guid("10000000-0000-0000-0000-000000000005"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Oeste" }
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
                    { new Guid("30000000-0000-0000-0000-000000000015"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "GERAL", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Alerta climático ativo na região. Siga as orientações da Defesa Civil, evite áreas de risco e mantenha crianças e idosos em local seguro.", 2, "Alerta climático ativo" }
                });

            migrationBuilder.InsertData(
                table: "Subprefeituras",
                columns: new[] { "Id", "Ativa", "AtualizadoEm", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId" },
                values: new object[,]
                {
                    { new Guid("20000000-0000-0000-0000-000000000001"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.5505, -46.633299999999998, "Sé", new Guid("10000000-0000-0000-0000-000000000001") },
                    { new Guid("20000000-0000-0000-0000-000000000002"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.556100000000001, -46.601900000000001, "Mooca", new Guid("10000000-0000-0000-0000-000000000001") },
                    { new Guid("20000000-0000-0000-0000-000000000003"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.526, -46.708399999999997, "Lapa", new Guid("10000000-0000-0000-0000-000000000001") },
                    { new Guid("20000000-0000-0000-0000-000000000004"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.566299999999998, -46.692900000000002, "Pinheiros", new Guid("10000000-0000-0000-0000-000000000001") },
                    { new Guid("20000000-0000-0000-0000-000000000005"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.587399999999999, -46.6355, "Vila Mariana", new Guid("10000000-0000-0000-0000-000000000001") },
                    { new Guid("20000000-0000-0000-0000-000000000006"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.567399999999999, -46.737099999999998, "Butantã", new Guid("10000000-0000-0000-0000-000000000001") },
                    { new Guid("20000000-0000-0000-0000-000000000007"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.500299999999999, -46.625799999999998, "Santana/Tucuruvi", new Guid("10000000-0000-0000-0000-000000000002") },
                    { new Guid("20000000-0000-0000-0000-000000000008"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.4986, -46.657800000000002, "Casa Verde/Cachoeirinha", new Guid("10000000-0000-0000-0000-000000000002") },
                    { new Guid("20000000-0000-0000-0000-000000000009"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.467300000000002, -46.688000000000002, "Freguesia do Ó/Brasilândia", new Guid("10000000-0000-0000-0000-000000000002") },
                    { new Guid("20000000-0000-0000-0000-000000000010"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.4726, -46.754100000000001, "Pirituba/Jaraguá", new Guid("10000000-0000-0000-0000-000000000002") },
                    { new Guid("20000000-0000-0000-0000-000000000011"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.403099999999998, -46.762099999999997, "Perus", new Guid("10000000-0000-0000-0000-000000000002") },
                    { new Guid("20000000-0000-0000-0000-000000000012"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.461200000000002, -46.5959, "Tremembé/Jacanã", new Guid("10000000-0000-0000-0000-000000000002") },
                    { new Guid("20000000-0000-0000-0000-000000000013"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.651, -46.707299999999996, "Santo Amaro", new Guid("10000000-0000-0000-0000-000000000003") },
                    { new Guid("20000000-0000-0000-0000-000000000014"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.6267, -46.767400000000002, "Campo Limpo", new Guid("10000000-0000-0000-0000-000000000003") },
                    { new Guid("20000000-0000-0000-0000-000000000015"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.706900000000001, -46.6875, "Capela do Socorro", new Guid("10000000-0000-0000-0000-000000000003") },
                    { new Guid("20000000-0000-0000-0000-000000000016"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.659700000000001, -46.6449, "Cidade Ademar", new Guid("10000000-0000-0000-0000-000000000003") },
                    { new Guid("20000000-0000-0000-0000-000000000017"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.709299999999999, -46.745100000000001, "M'Boi Mirim", new Guid("10000000-0000-0000-0000-000000000003") },
                    { new Guid("20000000-0000-0000-0000-000000000018"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.8246, -46.729599999999998, "Parelheiros", new Guid("10000000-0000-0000-0000-000000000003") },
                    { new Guid("20000000-0000-0000-0000-000000000019"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.5381, -46.535400000000003, "Aricanduva/Formosa/Carrão", new Guid("10000000-0000-0000-0000-000000000004") },
                    { new Guid("20000000-0000-0000-0000-000000000020"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.6082, -46.426000000000002, "Cidade Tiradentes", new Guid("10000000-0000-0000-0000-000000000004") },
                    { new Guid("20000000-0000-0000-0000-000000000021"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.506, -46.468800000000002, "Ermelino Matarazzo", new Guid("10000000-0000-0000-0000-000000000004") },
                    { new Guid("20000000-0000-0000-0000-000000000022"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.564, -46.411299999999997, "Guaianases", new Guid("10000000-0000-0000-0000-000000000004") },
                    { new Guid("20000000-0000-0000-0000-000000000023"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.514700000000001, -46.405700000000003, "Itaim Paulista", new Guid("10000000-0000-0000-0000-000000000004") },
                    { new Guid("20000000-0000-0000-0000-000000000024"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.537600000000001, -46.457000000000001, "Itaquera", new Guid("10000000-0000-0000-0000-000000000004") },
                    { new Guid("20000000-0000-0000-0000-000000000025"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.522400000000001, -46.530999999999999, "Penha", new Guid("10000000-0000-0000-0000-000000000004") },
                    { new Guid("20000000-0000-0000-0000-000000000026"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.618200000000002, -46.487299999999998, "São Mateus", new Guid("10000000-0000-0000-0000-000000000004") },
                    { new Guid("20000000-0000-0000-0000-000000000027"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.511500000000002, -46.445099999999996, "São Miguel Paulista", new Guid("10000000-0000-0000-0000-000000000004") },
                    { new Guid("20000000-0000-0000-0000-000000000028"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.591799999999999, -46.488100000000003, "Sapopemba", new Guid("10000000-0000-0000-0000-000000000004") },
                    { new Guid("20000000-0000-0000-0000-000000000029"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.586300000000001, -46.567, "Vila Prudente", new Guid("10000000-0000-0000-0000-000000000004") },
                    { new Guid("20000000-0000-0000-0000-000000000030"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.5868, -46.6083, "Ipiranga", new Guid("10000000-0000-0000-0000-000000000005") },
                    { new Guid("20000000-0000-0000-0000-000000000031"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.6554, -46.6432, "Jabaquara", new Guid("10000000-0000-0000-0000-000000000005") },
                    { new Guid("20000000-0000-0000-0000-000000000032"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.5138, -46.593800000000002, "Vila Maria/Vila Guilherme", new Guid("10000000-0000-0000-0000-000000000005") }
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
