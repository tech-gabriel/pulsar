using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pulsar.API.Migrations
{
    /// <inheritdoc />
    public partial class RemoverMigracoesFavoritoZona : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MigracoesFavoritoZona");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MigracoesFavoritoZona",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RegiaoId = table.Column<Guid>(type: "uuid", nullable: false),
                    UsuarioId = table.Column<Guid>(type: "uuid", nullable: false),
                    EmailAvisadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PushAvisadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MigracoesFavoritoZona", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MigracoesFavoritoZona_Regioes_RegiaoId",
                        column: x => x.RegiaoId,
                        principalTable: "Regioes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MigracoesFavoritoZona_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MigracoesFavoritoZona_RegiaoId",
                table: "MigracoesFavoritoZona",
                column: "RegiaoId");

            migrationBuilder.CreateIndex(
                name: "IX_MigracoesFavoritoZona_UsuarioId",
                table: "MigracoesFavoritoZona",
                column: "UsuarioId");
        }
    }
}
