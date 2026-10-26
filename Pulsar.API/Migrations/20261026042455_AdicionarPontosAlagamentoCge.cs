using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pulsar.API.Migrations
{
    /// <inheritdoc />
    public partial class AdicionarPontosAlagamentoCge : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PontosAlagamentoCge",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SubprefeituraId = table.Column<Guid>(type: "uuid", nullable: false),
                    Dia = table.Column<DateOnly>(type: "date", nullable: false),
                    Via = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Sentido = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Referencia = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    InicioUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    FimUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Ativo = table.Column<bool>(type: "boolean", nullable: false),
                    Transitavel = table.Column<bool>(type: "boolean", nullable: false),
                    VistoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PontosAlagamentoCge", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PontosAlagamentoCge_Subprefeituras_SubprefeituraId",
                        column: x => x.SubprefeituraId,
                        principalTable: "Subprefeituras",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PontosAlagamentoCge_SubprefeituraId_Dia_InicioUtc_Via_Senti~",
                table: "PontosAlagamentoCge",
                columns: new[] { "SubprefeituraId", "Dia", "InicioUtc", "Via", "Sentido", "Referencia" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PontosAlagamentoCge");
        }
    }
}
