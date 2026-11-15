using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pulsar.API.Migrations
{
    /// <inheritdoc />
    public partial class AdicionaChuvaMedidaAoScore : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "Chuva3hMedidaMm",
                table: "ScoresPerigo",
                type: "double precision",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Chuva3hMedidaMm",
                table: "ScoresPerigo");
        }
    }
}
