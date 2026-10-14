using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pulsar.API.Migrations
{
    /// <inheritdoc />
    public partial class AdicionarCarimboSeguranca : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CarimboSeguranca",
                table: "Usuarios",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "");

            // Cada conta existente ganha um carimbo próprio; tokens emitidos antes não têm a claim e
            // passam a receber 401 (decisão do SEC2: todo mundo entra de novo no deploy).
            migrationBuilder.Sql("""UPDATE "Usuarios" SET "CarimboSeguranca" = replace(gen_random_uuid()::text, '-', '');""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CarimboSeguranca",
                table: "Usuarios");
        }
    }
}
