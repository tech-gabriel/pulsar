using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pulsar.API.Migrations
{
    /// <inheritdoc />
    public partial class AdicionarPedidosAvisoRota : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PedidosAvisoRota",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UsuarioId = table.Column<Guid>(type: "uuid", nullable: false),
                    SubprefeituraIds = table.Column<string>(type: "character varying(1200)", maxLength: 1200, nullable: false),
                    Destino = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiraEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PedidosAvisoRota", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PedidosAvisoRota_ExpiraEm",
                table: "PedidosAvisoRota",
                column: "ExpiraEm");

            migrationBuilder.CreateIndex(
                name: "IX_PedidosAvisoRota_UsuarioId",
                table: "PedidosAvisoRota",
                column: "UsuarioId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PedidosAvisoRota");
        }
    }
}
