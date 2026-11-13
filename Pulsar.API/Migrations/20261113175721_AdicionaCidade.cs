using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pulsar.API.Migrations
{
    /// <inheritdoc />
    public partial class AdicionaCidade : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CidadeId",
                table: "Regioes",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateTable(
                name: "Cidades",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Nome = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Uf = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    CodigoIbge = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cidades", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "Cidades",
                columns: new[] { "Id", "AtualizadoEm", "CodigoIbge", "CriadoEm", "Nome", "Uf" },
                values: new object[] { new Guid("30000000-0000-0000-0000-000000000001"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "3550308", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "São Paulo", "SP" });

            migrationBuilder.UpdateData(
                table: "Regioes",
                keyColumn: "Id",
                keyValue: new Guid("10000000-0000-0000-0000-000000000001"),
                column: "CidadeId",
                value: new Guid("30000000-0000-0000-0000-000000000001"));

            migrationBuilder.UpdateData(
                table: "Regioes",
                keyColumn: "Id",
                keyValue: new Guid("10000000-0000-0000-0000-000000000002"),
                column: "CidadeId",
                value: new Guid("30000000-0000-0000-0000-000000000001"));

            migrationBuilder.UpdateData(
                table: "Regioes",
                keyColumn: "Id",
                keyValue: new Guid("10000000-0000-0000-0000-000000000003"),
                column: "CidadeId",
                value: new Guid("30000000-0000-0000-0000-000000000001"));

            migrationBuilder.UpdateData(
                table: "Regioes",
                keyColumn: "Id",
                keyValue: new Guid("10000000-0000-0000-0000-000000000004"),
                column: "CidadeId",
                value: new Guid("30000000-0000-0000-0000-000000000001"));

            migrationBuilder.UpdateData(
                table: "Regioes",
                keyColumn: "Id",
                keyValue: new Guid("10000000-0000-0000-0000-000000000005"),
                column: "CidadeId",
                value: new Guid("30000000-0000-0000-0000-000000000001"));

            migrationBuilder.CreateIndex(
                name: "IX_Regioes_CidadeId",
                table: "Regioes",
                column: "CidadeId");

            migrationBuilder.CreateIndex(
                name: "IX_Cidades_CodigoIbge",
                table: "Cidades",
                column: "CodigoIbge",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Regioes_Cidades_CidadeId",
                table: "Regioes",
                column: "CidadeId",
                principalTable: "Cidades",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Regioes_Cidades_CidadeId",
                table: "Regioes");

            migrationBuilder.DropTable(
                name: "Cidades");

            migrationBuilder.DropIndex(
                name: "IX_Regioes_CidadeId",
                table: "Regioes");

            migrationBuilder.DropColumn(
                name: "CidadeId",
                table: "Regioes");
        }
    }
}
