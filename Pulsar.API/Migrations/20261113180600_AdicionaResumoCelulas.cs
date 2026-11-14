using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pulsar.API.Migrations
{
    /// <inheritdoc />
    public partial class AdicionaResumoCelulas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ResumosCelulas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SubprefeituraId = table.Column<Guid>(type: "uuid", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ValorArea = table.Column<double>(type: "double precision", nullable: false),
                    ValorMeioTermo = table.Column<double>(type: "double precision", nullable: false),
                    FaixaMeioTermo = table.Column<int>(type: "integer", nullable: false),
                    ValorMaximo = table.Column<double>(type: "double precision", nullable: false),
                    Celulas = table.Column<int>(type: "integer", nullable: false),
                    CelulasModerado = table.Column<int>(type: "integer", nullable: false),
                    CelulasAlto = table.Column<int>(type: "integer", nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResumosCelulas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ResumosCelulas_Subprefeituras_SubprefeituraId",
                        column: x => x.SubprefeituraId,
                        principalTable: "Subprefeituras",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ResumosCelulas_SubprefeituraId_Timestamp",
                table: "ResumosCelulas",
                columns: new[] { "SubprefeituraId", "Timestamp" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ResumosCelulas_Timestamp",
                table: "ResumosCelulas",
                column: "Timestamp");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ResumosCelulas");
        }
    }
}
