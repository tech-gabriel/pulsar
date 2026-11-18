using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pulsar.API.Migrations
{
    /// <inheritdoc />
    public partial class AdicionaInstrucaoAoAlertaOficial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Instrucao",
                table: "AlertasOficiais",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Instrucao",
                table: "AlertasOficiais");
        }
    }
}
