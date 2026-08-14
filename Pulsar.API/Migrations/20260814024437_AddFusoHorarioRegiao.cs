using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pulsar.API.Migrations
{
    /// <inheritdoc />
    public partial class AddFusoHorarioRegiao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FusoHorario",
                table: "Regioes",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                // Alinhado ao padrão da entidade. String vazia aqui viraria uma linha
                // que quebra em FindSystemTimeZoneById se for inserida fora do EF.
                defaultValue: "America/Sao_Paulo");

            migrationBuilder.UpdateData(
                table: "Regioes",
                keyColumn: "Id",
                keyValue: new Guid("10000000-0000-0000-0000-000000000001"),
                column: "FusoHorario",
                value: "America/Sao_Paulo");

            migrationBuilder.UpdateData(
                table: "Regioes",
                keyColumn: "Id",
                keyValue: new Guid("10000000-0000-0000-0000-000000000002"),
                column: "FusoHorario",
                value: "America/Sao_Paulo");

            migrationBuilder.UpdateData(
                table: "Regioes",
                keyColumn: "Id",
                keyValue: new Guid("10000000-0000-0000-0000-000000000003"),
                column: "FusoHorario",
                value: "America/Sao_Paulo");

            migrationBuilder.UpdateData(
                table: "Regioes",
                keyColumn: "Id",
                keyValue: new Guid("10000000-0000-0000-0000-000000000004"),
                column: "FusoHorario",
                value: "America/Sao_Paulo");

            migrationBuilder.UpdateData(
                table: "Regioes",
                keyColumn: "Id",
                keyValue: new Guid("10000000-0000-0000-0000-000000000005"),
                column: "FusoHorario",
                value: "America/Sao_Paulo");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FusoHorario",
                table: "Regioes");
        }
    }
}
