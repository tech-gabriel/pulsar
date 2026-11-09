using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pulsar.API.Migrations
{
    /// <inheritdoc />
    public partial class AdicionarChuvaLocaisNaAssinatura : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ChuvaLocais",
                table: "AssinaturasPush",
                type: "boolean",
                nullable: false,
                // true: aparelhos já inscritos ficam com o aviso ligado (decisão do F4b).
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ChuvaLocais",
                table: "AssinaturasPush");
        }
    }
}
