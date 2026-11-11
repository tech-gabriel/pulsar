using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pulsar.API.Migrations
{
    /// <inheritdoc />
    public partial class AdicionarLeiturasEstacaoCge : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LeiturasEstacaoCge",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Posto = table.Column<int>(type: "integer", nullable: false),
                    SubprefeituraId = table.Column<Guid>(type: "uuid", nullable: true),
                    ColetadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ChuvaPeriodoMm = table.Column<double>(type: "double precision", nullable: false),
                    ChuvaPeriodoAnteriorMm = table.Column<double>(type: "double precision", nullable: false),
                    Zeramento = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    TemperaturaC = table.Column<double>(type: "double precision", nullable: true),
                    UmidadePct = table.Column<double>(type: "double precision", nullable: true),
                    VentoDirecao = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: true),
                    VentoKmH = table.Column<double>(type: "double precision", nullable: true),
                    RajadaKmH = table.Column<double>(type: "double precision", nullable: true),
                    PressaoHpa = table.Column<double>(type: "double precision", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LeiturasEstacaoCge", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LeiturasEstacaoCge_Subprefeituras_SubprefeituraId",
                        column: x => x.SubprefeituraId,
                        principalTable: "Subprefeituras",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LeiturasEstacaoCge_Posto_ColetadoEm",
                table: "LeiturasEstacaoCge",
                columns: new[] { "Posto", "ColetadoEm" });

            migrationBuilder.CreateIndex(
                name: "IX_LeiturasEstacaoCge_SubprefeituraId",
                table: "LeiturasEstacaoCge",
                column: "SubprefeituraId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LeiturasEstacaoCge");
        }
    }
}
