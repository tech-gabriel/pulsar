using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pulsar.API.Migrations
{
    /// <inheritdoc />
    public partial class AddPrevisaoClimatica : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PrevisoesClimaticas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SubprefeituraId = table.Column<Guid>(type: "uuid", nullable: false),
                    InstantePrevisto = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ChuvaMm = table.Column<double>(type: "double precision", nullable: false),
                    ProbabilidadeChuva = table.Column<double>(type: "double precision", nullable: false),
                    VentoKmH = table.Column<double>(type: "double precision", nullable: false),
                    RajadaKmH = table.Column<double>(type: "double precision", nullable: true),
                    TemperaturaC = table.Column<double>(type: "double precision", nullable: false),
                    CondicaoCodigo = table.Column<int>(type: "integer", nullable: false),
                    CondicaoDescricao = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    ColetadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PrevisoesClimaticas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PrevisoesClimaticas_Subprefeituras_SubprefeituraId",
                        column: x => x.SubprefeituraId,
                        principalTable: "Subprefeituras",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PrevisoesClimaticas_SubprefeituraId_InstantePrevisto",
                table: "PrevisoesClimaticas",
                columns: new[] { "SubprefeituraId", "InstantePrevisto" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PrevisoesClimaticas");
        }
    }
}
