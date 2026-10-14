using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pulsar.API.Migrations
{
    /// <summary>
    /// Grava os e-mails antigos na forma canônica (trim + minúsculas), a mesma de
    /// <c>Usuario.NormalizarEmail</c>; com isso o índice único passa a valer sem caixa.
    /// Quem colide com outra conta fica como está: o UPDATE não pode quebrar o índice
    /// (a migration roda no startup e derrubaria a API). Achar essas linhas:
    /// select lower(trim("Email")), count(*) from "Usuarios" group by 1 having count(*) > 1
    /// </summary>
    public partial class NormalizarEmailsUsuarios : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE "Usuarios" u
                SET "Email" = lower(trim(u."Email"))
                WHERE u."Email" <> lower(trim(u."Email"))
                  AND NOT EXISTS (
                      SELECT 1 FROM "Usuarios" o
                      WHERE o."Id" <> u."Id" AND lower(trim(o."Email")) = lower(trim(u."Email")));
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // A caixa original não é guardada; voltar não tem o que desfazer.
        }
    }
}
