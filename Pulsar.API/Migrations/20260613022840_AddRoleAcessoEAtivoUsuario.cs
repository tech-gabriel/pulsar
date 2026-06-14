using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pulsar.API.Migrations
{
    /// <inheritdoc />
    public partial class AddRoleAcessoEAtivoUsuario : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Ativo",
                table: "Usuarios",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<int>(
                name: "Role",
                table: "Usuarios",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Usuarios_Role",
                table: "Usuarios",
                column: "Role");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Usuarios_Role",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "Ativo",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "Role",
                table: "Usuarios");
        }
    }
}
