using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pulsar.API.Migrations
{
    /// <inheritdoc />
    public partial class AdicionaCaminhoAoPedidoAvisoRota : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "DestinoLat",
                table: "PedidosAvisoRota",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "DestinoLon",
                table: "PedidosAvisoRota",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "OrigemLat",
                table: "PedidosAvisoRota",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "OrigemLon",
                table: "PedidosAvisoRota",
                type: "double precision",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DestinoLat",
                table: "PedidosAvisoRota");

            migrationBuilder.DropColumn(
                name: "DestinoLon",
                table: "PedidosAvisoRota");

            migrationBuilder.DropColumn(
                name: "OrigemLat",
                table: "PedidosAvisoRota");

            migrationBuilder.DropColumn(
                name: "OrigemLon",
                table: "PedidosAvisoRota");
        }
    }
}
