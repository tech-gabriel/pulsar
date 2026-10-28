using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pulsar.API.Migrations
{
    /// <inheritdoc />
    public partial class AdicionarExecucoesSincronizacao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ExecucoesSincronizacao",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Fonte = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    IniciadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    FinalizadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Sucesso = table.Column<bool>(type: "boolean", nullable: false),
                    Lidas = table.Column<int>(type: "integer", nullable: false),
                    Novas = table.Column<int>(type: "integer", nullable: false),
                    Erro = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CriadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExecucoesSincronizacao", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ExecucoesSincronizacao_Fonte_IniciadoEm",
                table: "ExecucoesSincronizacao",
                columns: new[] { "Fonte", "IniciadoEm" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ExecucoesSincronizacao");
        }
    }
}
