using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pulsar.API.Migrations
{
    /// <inheritdoc />
    public partial class CascadeDeleteScoreAlerta : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Alertas_ScoresPerigo_ScoreId",
                table: "Alertas");

            migrationBuilder.DropForeignKey(
                name: "FK_ScoresPerigo_LeiturasClimaticas_LeituraId",
                table: "ScoresPerigo");

            migrationBuilder.AddForeignKey(
                name: "FK_Alertas_ScoresPerigo_ScoreId",
                table: "Alertas",
                column: "ScoreId",
                principalTable: "ScoresPerigo",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ScoresPerigo_LeiturasClimaticas_LeituraId",
                table: "ScoresPerigo",
                column: "LeituraId",
                principalTable: "LeiturasClimaticas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Alertas_ScoresPerigo_ScoreId",
                table: "Alertas");

            migrationBuilder.DropForeignKey(
                name: "FK_ScoresPerigo_LeiturasClimaticas_LeituraId",
                table: "ScoresPerigo");

            migrationBuilder.AddForeignKey(
                name: "FK_Alertas_ScoresPerigo_ScoreId",
                table: "Alertas",
                column: "ScoreId",
                principalTable: "ScoresPerigo",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ScoresPerigo_LeiturasClimaticas_LeituraId",
                table: "ScoresPerigo",
                column: "LeituraId",
                principalTable: "LeiturasClimaticas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
