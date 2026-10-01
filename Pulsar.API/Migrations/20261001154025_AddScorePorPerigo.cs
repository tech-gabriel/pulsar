using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pulsar.API.Migrations
{
    /// <inheritdoc />
    public partial class AddScorePorPerigo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "Chuva3hMm",
                table: "ScoresPerigo",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "Chuva48hMm",
                table: "ScoresPerigo",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<int>(
                name: "FaixaAlagamento",
                table: "ScoresPerigo",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "FaixaCalor",
                table: "ScoresPerigo",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "FaixaVento",
                table: "ScoresPerigo",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "PerigoPrincipal",
                table: "ScoresPerigo",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<double>(
                name: "ValorAlagamento",
                table: "ScoresPerigo",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "ValorCalor",
                table: "ScoresPerigo",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "ValorVento",
                table: "ScoresPerigo",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "ScoreAlagamentoMax",
                table: "AgregadosDiarios",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Chuva3hMm",
                table: "ScoresPerigo");

            migrationBuilder.DropColumn(
                name: "Chuva48hMm",
                table: "ScoresPerigo");

            migrationBuilder.DropColumn(
                name: "FaixaAlagamento",
                table: "ScoresPerigo");

            migrationBuilder.DropColumn(
                name: "FaixaCalor",
                table: "ScoresPerigo");

            migrationBuilder.DropColumn(
                name: "FaixaVento",
                table: "ScoresPerigo");

            migrationBuilder.DropColumn(
                name: "PerigoPrincipal",
                table: "ScoresPerigo");

            migrationBuilder.DropColumn(
                name: "ValorAlagamento",
                table: "ScoresPerigo");

            migrationBuilder.DropColumn(
                name: "ValorCalor",
                table: "ScoresPerigo");

            migrationBuilder.DropColumn(
                name: "ValorVento",
                table: "ScoresPerigo");

            migrationBuilder.DropColumn(
                name: "ScoreAlagamentoMax",
                table: "AgregadosDiarios");
        }
    }
}
