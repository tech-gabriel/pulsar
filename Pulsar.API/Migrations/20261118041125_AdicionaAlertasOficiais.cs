using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pulsar.API.Migrations
{
    /// <inheritdoc />
    public partial class AdicionaAlertasOficiais : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AlertasOficiais",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Identificador = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Evento = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Gravidade = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Urgencia = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    InicioUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiraUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Emissor = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Titulo = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Descricao = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    CanceladoEmUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RecebidoEmUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AlertasOficiais", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AlertaOficialArea",
                columns: table => new
                {
                    AlertaOficialId = table.Column<Guid>(type: "uuid", nullable: false),
                    SubprefeituraId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AlertaOficialArea", x => new { x.AlertaOficialId, x.SubprefeituraId });
                    table.ForeignKey(
                        name: "FK_AlertaOficialArea_AlertasOficiais_AlertaOficialId",
                        column: x => x.AlertaOficialId,
                        principalTable: "AlertasOficiais",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AlertaOficialArea_Subprefeituras_SubprefeituraId",
                        column: x => x.SubprefeituraId,
                        principalTable: "Subprefeituras",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AlertaOficialArea_SubprefeituraId",
                table: "AlertaOficialArea",
                column: "SubprefeituraId");

            migrationBuilder.CreateIndex(
                name: "IX_AlertasOficiais_ExpiraUtc",
                table: "AlertasOficiais",
                column: "ExpiraUtc");

            migrationBuilder.CreateIndex(
                name: "IX_AlertasOficiais_Identificador",
                table: "AlertasOficiais",
                column: "Identificador",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AlertaOficialArea");

            migrationBuilder.DropTable(
                name: "AlertasOficiais");
        }
    }
}
