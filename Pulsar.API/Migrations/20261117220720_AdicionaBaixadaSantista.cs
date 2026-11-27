using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Pulsar.API.Migrations
{
    /// <inheritdoc />
    public partial class AdicionaBaixadaSantista : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CodigoIbge",
                table: "Subprefeituras",
                type: "character varying(7)",
                maxLength: 7,
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "CodigoIbge",
                table: "Cidades",
                type: "character varying(7)",
                maxLength: 7,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(7)",
                oldMaxLength: 7);

            migrationBuilder.AddColumn<bool>(
                name: "Publica",
                table: "Cidades",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.UpdateData(
                table: "Cidades",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000001"),
                column: "Publica",
                value: true);

            migrationBuilder.InsertData(
                table: "Cidades",
                columns: new[] { "Id", "AtualizadoEm", "CodigoIbge", "CriadoEm", "Nome", "Publica", "Uf" },
                values: new object[] { new Guid("30000000-0000-0000-0000-000000000002"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Baixada Santista", false, "SP" });

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000001"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000002"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000003"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000004"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000005"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000006"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000007"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000008"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000009"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000010"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000011"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000012"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000013"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000014"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000015"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000016"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000017"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000018"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000019"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000020"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000021"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000022"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000023"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000024"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000025"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000026"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000027"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000028"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000029"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000030"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000031"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.UpdateData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000032"),
                column: "CodigoIbge",
                value: null);

            migrationBuilder.InsertData(
                table: "Regioes",
                columns: new[] { "Id", "AtualizadoEm", "CidadeId", "CriadoEm", "FusoHorario", "Nome" },
                values: new object[] { new Guid("10000000-0000-0000-0000-000000000006"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new Guid("30000000-0000-0000-0000-000000000002"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "America/Sao_Paulo", "Baixada Santista" });

            migrationBuilder.InsertData(
                table: "Subprefeituras",
                columns: new[] { "Id", "Ativa", "AtualizadoEm", "CodigoIbge", "CriadoEm", "Latitude", "Longitude", "Nome", "RegiaoId" },
                values: new object[,]
                {
                    { new Guid("20000000-0000-0000-0000-000000000033"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "3548500", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.960799999999999, -46.333599999999997, "Santos", new Guid("10000000-0000-0000-0000-000000000006") },
                    { new Guid("20000000-0000-0000-0000-000000000034"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "3551009", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.963100000000001, -46.3919, "São Vicente", new Guid("10000000-0000-0000-0000-000000000006") },
                    { new Guid("20000000-0000-0000-0000-000000000035"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "3518701", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.993099999999998, -46.256399999999999, "Guarujá", new Guid("10000000-0000-0000-0000-000000000006") },
                    { new Guid("20000000-0000-0000-0000-000000000036"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "3513504", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.895, -46.425400000000003, "Cubatão", new Guid("10000000-0000-0000-0000-000000000006") },
                    { new Guid("20000000-0000-0000-0000-000000000037"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "3541000", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -24.005800000000001, -46.402799999999999, "Praia Grande", new Guid("10000000-0000-0000-0000-000000000006") },
                    { new Guid("20000000-0000-0000-0000-000000000038"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "3506359", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -23.848600000000001, -46.139600000000002, "Bertioga", new Guid("10000000-0000-0000-0000-000000000006") },
                    { new Guid("20000000-0000-0000-0000-000000000039"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "3531100", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -24.0931, -46.620800000000003, "Mongaguá", new Guid("10000000-0000-0000-0000-000000000006") },
                    { new Guid("20000000-0000-0000-0000-000000000040"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "3522109", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -24.1831, -46.788899999999998, "Itanhaém", new Guid("10000000-0000-0000-0000-000000000006") },
                    { new Guid("20000000-0000-0000-0000-000000000041"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "3537602", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), -24.32, -46.9983, "Peruíbe", new Guid("10000000-0000-0000-0000-000000000006") }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000033"));

            migrationBuilder.DeleteData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000034"));

            migrationBuilder.DeleteData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000035"));

            migrationBuilder.DeleteData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000036"));

            migrationBuilder.DeleteData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000037"));

            migrationBuilder.DeleteData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000038"));

            migrationBuilder.DeleteData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000039"));

            migrationBuilder.DeleteData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000040"));

            migrationBuilder.DeleteData(
                table: "Subprefeituras",
                keyColumn: "Id",
                keyValue: new Guid("20000000-0000-0000-0000-000000000041"));

            migrationBuilder.DeleteData(
                table: "Regioes",
                keyColumn: "Id",
                keyValue: new Guid("10000000-0000-0000-0000-000000000006"));

            migrationBuilder.DeleteData(
                table: "Cidades",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000002"));

            migrationBuilder.DropColumn(
                name: "CodigoIbge",
                table: "Subprefeituras");

            migrationBuilder.DropColumn(
                name: "Publica",
                table: "Cidades");

            migrationBuilder.AlterColumn<string>(
                name: "CodigoIbge",
                table: "Cidades",
                type: "character varying(7)",
                maxLength: 7,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(7)",
                oldMaxLength: 7,
                oldNullable: true);
        }
    }
}
