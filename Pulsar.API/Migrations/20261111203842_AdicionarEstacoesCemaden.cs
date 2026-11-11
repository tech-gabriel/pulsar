using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pulsar.API.Migrations
{
    /// <inheritdoc />
    public partial class AdicionarEstacoesCemaden : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EstacoesCemaden",
                columns: table => new
                {
                    CodEstacao = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CodIbge = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: false),
                    Nome = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Latitude = table.Column<double>(type: "double precision", nullable: false),
                    Longitude = table.Column<double>(type: "double precision", nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EstacoesCemaden", x => x.CodEstacao);
                });

            migrationBuilder.CreateTable(
                name: "LeiturasEstacaoCemaden",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CodEstacao = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    DataHora = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ColetadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Acc1h = table.Column<double>(type: "double precision", nullable: true),
                    Acc3h = table.Column<double>(type: "double precision", nullable: true),
                    Acc6h = table.Column<double>(type: "double precision", nullable: true),
                    Acc12h = table.Column<double>(type: "double precision", nullable: true),
                    Acc24h = table.Column<double>(type: "double precision", nullable: true),
                    Acc48h = table.Column<double>(type: "double precision", nullable: true),
                    Acc72h = table.Column<double>(type: "double precision", nullable: true),
                    Acc96h = table.Column<double>(type: "double precision", nullable: true),
                    Acc120h = table.Column<double>(type: "double precision", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LeiturasEstacaoCemaden", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EstacoesCemaden_CodIbge",
                table: "EstacoesCemaden",
                column: "CodIbge");

            migrationBuilder.CreateIndex(
                name: "IX_LeiturasEstacaoCemaden_CodEstacao_DataHora",
                table: "LeiturasEstacaoCemaden",
                columns: new[] { "CodEstacao", "DataHora" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EstacoesCemaden");

            migrationBuilder.DropTable(
                name: "LeiturasEstacaoCemaden");
        }
    }
}
