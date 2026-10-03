using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pulsar.API.Migrations
{
    /// <inheritdoc />
    public partial class SubprefeituraComoUnidade : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // As linhas antigas são por zona e não têm pessoa: o EF renomearia RegiaoId para
            // UsuarioId e deixaria ids de zona onde deveria haver id de pessoa. Livro-caixa
            // recomeça vazio (efeito aceito: um aviso pode se repetir na primeira hora).
            migrationBuilder.Sql("DELETE FROM \"NotificacoesEnviadas\";");

            migrationBuilder.DropForeignKey(
                name: "FK_NotificacoesEnviadas_Regioes_RegiaoId",
                table: "NotificacoesEnviadas");

            migrationBuilder.DropIndex(
                name: "IX_NotificacoesEnviadas_Chave",
                table: "NotificacoesEnviadas");

            migrationBuilder.DropIndex(
                name: "IX_NotificacoesEnviadas_RegiaoId_Gatilho_EnviadoEm",
                table: "NotificacoesEnviadas");

            migrationBuilder.DropColumn(
                name: "Destinatarios",
                table: "NotificacoesEnviadas");

            migrationBuilder.RenameColumn(
                name: "RegiaoId",
                table: "NotificacoesEnviadas",
                newName: "UsuarioId");

            migrationBuilder.AddColumn<Guid>(
                name: "EnvioId",
                table: "NotificacoesEnviadas",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "SubprefeituraId",
                table: "NotificacoesEnviadas",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateTable(
                name: "MigracoesFavoritoZona",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UsuarioId = table.Column<Guid>(type: "uuid", nullable: false),
                    RegiaoId = table.Column<Guid>(type: "uuid", nullable: false),
                    PushAvisadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    EmailAvisadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
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

            // Cópia antes de apagar: quem avisar, de qual zona, e plano de volta.
            migrationBuilder.Sql(
                "INSERT INTO \"MigracoesFavoritoZona\" (\"Id\", \"UsuarioId\", \"RegiaoId\") " +
                "SELECT \"Id\", \"UsuarioId\", \"RegiaoId\" FROM \"UsuarioRegioes\";");

            migrationBuilder.DropTable(
                name: "UsuarioRegioes");

            migrationBuilder.CreateTable(
                name: "UsuarioSubprefeituras",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UsuarioId = table.Column<Guid>(type: "uuid", nullable: false),
                    SubprefeituraId = table.Column<Guid>(type: "uuid", nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UsuarioSubprefeituras", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UsuarioSubprefeituras_Subprefeituras_SubprefeituraId",
                        column: x => x.SubprefeituraId,
                        principalTable: "Subprefeituras",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UsuarioSubprefeituras_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NotificacoesEnviadas_SubprefeituraId",
                table: "NotificacoesEnviadas",
                column: "SubprefeituraId");

            migrationBuilder.CreateIndex(
                name: "IX_NotificacoesEnviadas_UsuarioId_Chave",
                table: "NotificacoesEnviadas",
                columns: new[] { "UsuarioId", "Chave" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NotificacoesEnviadas_UsuarioId_EnviadoEm",
                table: "NotificacoesEnviadas",
                columns: new[] { "UsuarioId", "EnviadoEm" });

            migrationBuilder.CreateIndex(
                name: "IX_MigracoesFavoritoZona_RegiaoId",
                table: "MigracoesFavoritoZona",
                column: "RegiaoId");

            migrationBuilder.CreateIndex(
                name: "IX_MigracoesFavoritoZona_UsuarioId",
                table: "MigracoesFavoritoZona",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_UsuarioSubprefeituras_SubprefeituraId",
                table: "UsuarioSubprefeituras",
                column: "SubprefeituraId");

            migrationBuilder.CreateIndex(
                name: "IX_UsuarioSubprefeituras_UsuarioId_SubprefeituraId",
                table: "UsuarioSubprefeituras",
                columns: new[] { "UsuarioId", "SubprefeituraId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_NotificacoesEnviadas_Subprefeituras_SubprefeituraId",
                table: "NotificacoesEnviadas",
                column: "SubprefeituraId",
                principalTable: "Subprefeituras",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_NotificacoesEnviadas_Usuarios_UsuarioId",
                table: "NotificacoesEnviadas",
                column: "UsuarioId",
                principalTable: "Usuarios",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_NotificacoesEnviadas_Subprefeituras_SubprefeituraId",
                table: "NotificacoesEnviadas");

            migrationBuilder.DropForeignKey(
                name: "FK_NotificacoesEnviadas_Usuarios_UsuarioId",
                table: "NotificacoesEnviadas");

            migrationBuilder.DropTable(
                name: "MigracoesFavoritoZona");

            migrationBuilder.DropTable(
                name: "UsuarioSubprefeituras");

            migrationBuilder.DropIndex(
                name: "IX_NotificacoesEnviadas_SubprefeituraId",
                table: "NotificacoesEnviadas");

            migrationBuilder.DropIndex(
                name: "IX_NotificacoesEnviadas_UsuarioId_Chave",
                table: "NotificacoesEnviadas");

            migrationBuilder.DropIndex(
                name: "IX_NotificacoesEnviadas_UsuarioId_EnviadoEm",
                table: "NotificacoesEnviadas");

            migrationBuilder.DropColumn(
                name: "EnvioId",
                table: "NotificacoesEnviadas");

            migrationBuilder.DropColumn(
                name: "SubprefeituraId",
                table: "NotificacoesEnviadas");

            migrationBuilder.RenameColumn(
                name: "UsuarioId",
                table: "NotificacoesEnviadas",
                newName: "RegiaoId");

            migrationBuilder.AddColumn<int>(
                name: "Destinatarios",
                table: "NotificacoesEnviadas",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "UsuarioRegioes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RegiaoId = table.Column<Guid>(type: "uuid", nullable: false),
                    UsuarioId = table.Column<Guid>(type: "uuid", nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UsuarioRegioes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UsuarioRegioes_Regioes_RegiaoId",
                        column: x => x.RegiaoId,
                        principalTable: "Regioes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UsuarioRegioes_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
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

            migrationBuilder.CreateIndex(
                name: "IX_UsuarioRegioes_RegiaoId",
                table: "UsuarioRegioes",
                column: "RegiaoId");

            migrationBuilder.CreateIndex(
                name: "IX_UsuarioRegioes_UsuarioId_RegiaoId",
                table: "UsuarioRegioes",
                columns: new[] { "UsuarioId", "RegiaoId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_NotificacoesEnviadas_Regioes_RegiaoId",
                table: "NotificacoesEnviadas",
                column: "RegiaoId",
                principalTable: "Regioes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
