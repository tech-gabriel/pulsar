using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pulsar.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTemperaturaSensacaoUmidade : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "SensacaoTermica",
                table: "LeiturasClimaticas",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "TemperaturaC",
                table: "LeiturasClimaticas",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "Umidade",
                table: "LeiturasClimaticas",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SensacaoTermica",
                table: "LeiturasClimaticas");

            migrationBuilder.DropColumn(
                name: "TemperaturaC",
                table: "LeiturasClimaticas");

            migrationBuilder.DropColumn(
                name: "Umidade",
                table: "LeiturasClimaticas");
        }
    }
}
