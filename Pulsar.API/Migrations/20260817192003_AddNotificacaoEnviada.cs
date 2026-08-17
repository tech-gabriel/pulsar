using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pulsar.API.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificacaoEnviada : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NotificacoesEnviadas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RegiaoId = table.Column<Guid>(type: "uuid", nullable: false),
                    Gatilho = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Chave = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    EnviadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Destinatarios = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificacoesEnviadas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NotificacoesEnviadas_Regioes_RegiaoId",
                        column: x => x.RegiaoId,
                        principalTable: "Regioes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NotificacoesEnviadas_Chave",
                table: "NotificacoesEnviadas",
                column: "Chave",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NotificacoesEnviadas_RegiaoId_Gatilho_EnviadoEm",
                table: "NotificacoesEnviadas",
                columns: new[] { "RegiaoId", "Gatilho", "EnviadoEm" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NotificacoesEnviadas");
        }
    }
}
