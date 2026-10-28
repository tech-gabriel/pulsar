using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pulsar.API.Migrations
{
    /// <inheritdoc />
    public partial class AdicionarAgregadoHorario : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AgregadosHorarios",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SubprefeituraId = table.Column<Guid>(type: "uuid", nullable: false),
                    HoraUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ChuvaMm = table.Column<double>(type: "double precision", nullable: false),
                    ChuvaBrutaMm = table.Column<double>(type: "double precision", nullable: false),
                    ScoreAlagamentoMax = table.Column<double>(type: "double precision", nullable: false),
                    LeiturasCount = table.Column<int>(type: "integer", nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AgregadosHorarios", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AgregadosHorarios_Subprefeituras_SubprefeituraId",
                        column: x => x.SubprefeituraId,
                        principalTable: "Subprefeituras",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AgregadosHorarios_SubprefeituraId_HoraUtc",
                table: "AgregadosHorarios",
                columns: new[] { "SubprefeituraId", "HoraUtc" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AgregadosHorarios");
        }
    }
}
