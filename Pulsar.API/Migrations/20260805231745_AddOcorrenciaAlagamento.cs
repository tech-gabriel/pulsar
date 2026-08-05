using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pulsar.API.Migrations
{
    /// <inheritdoc />
    public partial class AddOcorrenciaAlagamento : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "OcorrenciasAlagamento",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CdIdentificador = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Tipo = table.Column<int>(type: "integer", nullable: false),
                    DataOcorrencia = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Latitude = table.Column<double>(type: "double precision", nullable: false),
                    Longitude = table.Column<double>(type: "double precision", nullable: false),
                    NmSubprefeitura = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    FonteOriginal = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DataCarga = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OcorrenciasAlagamento", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OcorrenciasAlagamento_CdIdentificador_Tipo",
                table: "OcorrenciasAlagamento",
                columns: new[] { "CdIdentificador", "Tipo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OcorrenciasAlagamento_DataOcorrencia",
                table: "OcorrenciasAlagamento",
                column: "DataOcorrencia");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OcorrenciasAlagamento");
        }
    }
}
