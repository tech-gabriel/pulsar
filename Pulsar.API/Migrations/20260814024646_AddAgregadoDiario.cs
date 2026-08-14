using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pulsar.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAgregadoDiario : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AgregadosDiarios",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SubprefeituraId = table.Column<Guid>(type: "uuid", nullable: false),
                    Dia = table.Column<DateOnly>(type: "date", nullable: false),
                    FusoHorario = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ChuvaTotalMm = table.Column<double>(type: "double precision", nullable: false),
                    ScoreMin = table.Column<double>(type: "double precision", nullable: false),
                    ScoreMedio = table.Column<double>(type: "double precision", nullable: false),
                    ScoreMax = table.Column<double>(type: "double precision", nullable: false),
                    LeiturasBaixo = table.Column<int>(type: "integer", nullable: false),
                    LeiturasModerado = table.Column<int>(type: "integer", nullable: false),
                    LeiturasAlto = table.Column<int>(type: "integer", nullable: false),
                    VentoMaxKmH = table.Column<double>(type: "double precision", nullable: false),
                    TemperaturaMinC = table.Column<double>(type: "double precision", nullable: false),
                    TemperaturaMaxC = table.Column<double>(type: "double precision", nullable: false),
                    UvMax = table.Column<double>(type: "double precision", nullable: false),
                    LeiturasCount = table.Column<int>(type: "integer", nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AgregadosDiarios", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AgregadosDiarios_Subprefeituras_SubprefeituraId",
                        column: x => x.SubprefeituraId,
                        principalTable: "Subprefeituras",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AgregadosDiarios_SubprefeituraId_Dia",
                table: "AgregadosDiarios",
                columns: new[] { "SubprefeituraId", "Dia" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AgregadosDiarios");
        }
    }
}
