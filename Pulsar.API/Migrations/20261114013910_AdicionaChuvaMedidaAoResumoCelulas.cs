using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pulsar.API.Migrations
{
    /// <inheritdoc />
    public partial class AdicionaChuvaMedidaAoResumoCelulas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CelulasAltoMaior",
                table: "ResumosCelulas",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "CelulasAltoMedida",
                table: "ResumosCelulas",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "CelulasComMedida",
                table: "ResumosCelulas",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<double>(
                name: "Chuva3hMedidaMm",
                table: "ResumosCelulas",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Chuva3hModeloMm",
                table: "ResumosCelulas",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "ValorMeioTermoMaior",
                table: "ResumosCelulas",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "ValorMeioTermoMedida",
                table: "ResumosCelulas",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CelulasAltoMaior",
                table: "ResumosCelulas");

            migrationBuilder.DropColumn(
                name: "CelulasAltoMedida",
                table: "ResumosCelulas");

            migrationBuilder.DropColumn(
                name: "CelulasComMedida",
                table: "ResumosCelulas");

            migrationBuilder.DropColumn(
                name: "Chuva3hMedidaMm",
                table: "ResumosCelulas");

            migrationBuilder.DropColumn(
                name: "Chuva3hModeloMm",
                table: "ResumosCelulas");

            migrationBuilder.DropColumn(
                name: "ValorMeioTermoMaior",
                table: "ResumosCelulas");

            migrationBuilder.DropColumn(
                name: "ValorMeioTermoMedida",
                table: "ResumosCelulas");
        }
    }
}
