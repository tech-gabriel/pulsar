using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Pulsar.API.Migrations
{
    /// <inheritdoc />
    public partial class AdicionarSugestoesCompletas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Sugestoes",
                columns: new[] { "Id", "Ativa", "AtualizadoEm", "Categoria", "CriadoEm", "Descricao", "FaixaRisco", "Titulo" },
                values: new object[,]
                {
                    { new Guid("30000000-0000-0000-0000-000000000016"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "CHUVA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Mantenha um guarda-chuva próximo. Chuviscos podem ocorrer sem aviso prévio, especialmente no final da tarde.", 0, "Guarde o guarda-chuva acessível" },
                    { new Guid("30000000-0000-0000-0000-000000000017"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "CHUVA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Mesmo com chuva fraca, verifique o estado de bueiros na sua rua e evite caminhar próximo a calçadas alagadas.", 0, "Atenção a bueiros e valetas" },
                    { new Guid("30000000-0000-0000-0000-000000000018"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "CHUVA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Verifique o histórico de alagamentos da sua rota antes de sair. Marginais, viadutos e pontos baixos são os primeiros a alagar.", 1, "Evite áreas alagáveis" },
                    { new Guid("30000000-0000-0000-0000-000000000019"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "CHUVA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Pista molhada aumenta a distância de frenagem em até 2x. Reduza a velocidade e mantenha distância segura do veículo à frente.", 1, "Reduza a velocidade no trânsito" },
                    { new Guid("30000000-0000-0000-0000-000000000020"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "CHUVA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Em áreas de encosta, saia imediatamente e dirija-se ao abrigo mais próximo. Ligue para a Defesa Civil: 199.", 2, "Risco de deslizamento" },
                    { new Guid("30000000-0000-0000-0000-000000000021"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "CHUVA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "30 cm de água em movimento podem derrubar um adulto e 60 cm podem arrastar um veículo. Nunca tente atravessar vias alagadas.", 2, "Nunca atravesse enxurradas" },
                    { new Guid("30000000-0000-0000-0000-000000000022"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "VENTO", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Vento suave. Atividades ao ar livre podem ser realizadas normalmente. Boa condição para caminhadas e esportes externos.", 0, "Condições favoráveis ao ar livre" },
                    { new Guid("30000000-0000-0000-0000-000000000023"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "VENTO", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Mesmo com vento fraco, objetos leves podem ser deslocados. Feche janelas e portas ao deixar o ambiente.", 0, "Verifique janelas abertas" },
                    { new Guid("30000000-0000-0000-0000-000000000024"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "VENTO", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Recolha vasos, cadeiras e outros objetos de sacadas e áreas externas. Rajadas podem deslocar itens e causar acidentes.", 1, "Proteja objetos em sacadas" },
                    { new Guid("30000000-0000-0000-0000-000000000025"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "VENTO", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Rajadas de vento podem abrir portas com força inesperada. Segure a maçaneta ao abrir portas externas.", 1, "Cuidado ao abrir portas" },
                    { new Guid("30000000-0000-0000-0000-000000000026"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "VENTO", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Ventos fortes podem derrubar galhos e árvores inteiras. Mantenha-se longe de árvores, postes e coberturas improvisadas.", 2, "Evite ficar sob árvores" },
                    { new Guid("30000000-0000-0000-0000-000000000027"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "VENTO", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Caminhões, ônibus e veículos altos têm risco de tombamento. Motoristas devem reduzir velocidade e evitar pistas elevadas.", 2, "Risco para veículos altos" },
                    { new Guid("30000000-0000-0000-0000-000000000028"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "NEBLINA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Visibilidade adequada para todas as atividades. Continue com as atividades normais com a atenção de sempre.", 0, "Sem restrições de visibilidade" },
                    { new Guid("30000000-0000-0000-0000-000000000029"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "NEBLINA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Em dias frios e úmidos, neblina leve pode surgir nas primeiras horas da manhã. Fique atento ao sair cedo.", 0, "Neblina matinal pode ocorrer" },
                    { new Guid("30000000-0000-0000-0000-000000000030"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "NEBLINA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Com neblina, o farol baixo melhora tanto sua visibilidade quanto a percepção dos outros motoristas. Nunca use farol alto — aumenta o ofuscamento.", 1, "Use farol baixo obrigatório" },
                    { new Guid("30000000-0000-0000-0000-000000000031"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "NEBLINA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Com visibilidade reduzida, aumente para pelo menos 4 segundos a distância do veículo à frente. Evite ultrapassagens.", 1, "Aumente a distância segura" },
                    { new Guid("30000000-0000-0000-0000-000000000032"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "NEBLINA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Se a visibilidade for inferior a 50m, pare o veículo em local seguro fora da pista e acione o pisca-alerta. Aguarde a neblina dissipar.", 2, "Pare em local seguro se necessário" },
                    { new Guid("30000000-0000-0000-0000-000000000033"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "NEBLINA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Com neblina densa, pedestres devem usar roupas claras ou refletivas e evitar caminhar em vias com tráfego de veículos.", 2, "Pedestres: use roupas claras" },
                    { new Guid("30000000-0000-0000-0000-000000000034"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "UV", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Com índice UV baixo, um protetor solar FPS 15 já oferece proteção adequada para a maioria das pessoas em atividades ao ar livre.", 0, "Protetor solar FPS 15 suficiente" },
                    { new Guid("30000000-0000-0000-0000-000000000035"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "UV", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Índice UV favorável para atividades ao ar livre. Aproveite mas lembre-se de se hidratar bem.", 0, "Bom momento para atividades externas" },
                    { new Guid("30000000-0000-0000-0000-000000000036"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "UV", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Chapéu de aba larga e óculos com proteção UV são essenciais. Reaplicar protetor solar a cada 2 horas ou após suar.", 1, "Use chapéu e óculos de sol" },
                    { new Guid("30000000-0000-0000-0000-000000000037"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "UV", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Crianças e idosos são mais sensíveis à radiação UV. Aplique protetor solar antes de sair e evite exposição direta nos horários de pico.", 1, "Proteja crianças e idosos" },
                    { new Guid("30000000-0000-0000-0000-000000000038"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "UV", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Com UV elevado, a pele pode queimar em menos de 15 minutos de exposição sem proteção. Mantenha-se na sombra ou em ambientes internos.", 2, "Risco de queimaduras em minutos" },
                    { new Guid("30000000-0000-0000-0000-000000000039"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "UV", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Além da proteção solar, beba pelo menos 2 litros de água por dia. Calor intenso combinado com UV alto aumenta risco de desidratação e insolação.", 2, "Hidratação reforçada" },
                    { new Guid("30000000-0000-0000-0000-000000000040"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "GERAL", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Mesmo com baixo risco, acompanhe as atualizações do Pulsar a cada 15 minutos. Condições climáticas podem mudar rapidamente.", 0, "Mantenha-se informado" },
                    { new Guid("30000000-0000-0000-0000-000000000041"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "GERAL", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Dia com baixo risco climático. Ótimo para atividades ao ar livre. Leve água e protetor solar como precaução básica.", 0, "Bom dia para atividades externas" },
                    { new Guid("30000000-0000-0000-0000-000000000042"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "GERAL", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Antes de sair, verifique o score da sua região no Pulsar. Com risco moderado, prefira horários com menor intensidade climática.", 1, "Planeje suas saídas com antecedência" },
                    { new Guid("30000000-0000-0000-0000-000000000043"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "GERAL", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Mantenha no carro: lanternas, cobertor, kit de primeiros socorros, carregador portátil e água. Em situações moderadas, a preparação faz a diferença.", 1, "Kit de emergência no carro" },
                    { new Guid("30000000-0000-0000-0000-000000000044"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "GERAL", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Em situação de risco, ligue 199 (Defesa Civil) ou 193 (Bombeiros). Não espere a situação piorar para pedir ajuda.", 2, "Ligue para a Defesa Civil" },
                    { new Guid("30000000-0000-0000-0000-000000000045"), true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "GERAL", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Com alerta ativo, fique em local seguro. Se precisar sair, informe alguém sobre seu destino e rota. Prefira rotas conhecidas e seguras.", 2, "Evite deslocamentos desnecessários" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Sugestoes",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000016"));

            migrationBuilder.DeleteData(
                table: "Sugestoes",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000017"));

            migrationBuilder.DeleteData(
                table: "Sugestoes",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000018"));

            migrationBuilder.DeleteData(
                table: "Sugestoes",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000019"));

            migrationBuilder.DeleteData(
                table: "Sugestoes",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000020"));

            migrationBuilder.DeleteData(
                table: "Sugestoes",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000021"));

            migrationBuilder.DeleteData(
                table: "Sugestoes",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000022"));

            migrationBuilder.DeleteData(
                table: "Sugestoes",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000023"));

            migrationBuilder.DeleteData(
                table: "Sugestoes",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000024"));

            migrationBuilder.DeleteData(
                table: "Sugestoes",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000025"));

            migrationBuilder.DeleteData(
                table: "Sugestoes",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000026"));

            migrationBuilder.DeleteData(
                table: "Sugestoes",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000027"));

            migrationBuilder.DeleteData(
                table: "Sugestoes",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000028"));

            migrationBuilder.DeleteData(
                table: "Sugestoes",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000029"));

            migrationBuilder.DeleteData(
                table: "Sugestoes",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000030"));

            migrationBuilder.DeleteData(
                table: "Sugestoes",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000031"));

            migrationBuilder.DeleteData(
                table: "Sugestoes",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000032"));

            migrationBuilder.DeleteData(
                table: "Sugestoes",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000033"));

            migrationBuilder.DeleteData(
                table: "Sugestoes",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000034"));

            migrationBuilder.DeleteData(
                table: "Sugestoes",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000035"));

            migrationBuilder.DeleteData(
                table: "Sugestoes",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000036"));

            migrationBuilder.DeleteData(
                table: "Sugestoes",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000037"));

            migrationBuilder.DeleteData(
                table: "Sugestoes",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000038"));

            migrationBuilder.DeleteData(
                table: "Sugestoes",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000039"));

            migrationBuilder.DeleteData(
                table: "Sugestoes",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000040"));

            migrationBuilder.DeleteData(
                table: "Sugestoes",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000041"));

            migrationBuilder.DeleteData(
                table: "Sugestoes",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000042"));

            migrationBuilder.DeleteData(
                table: "Sugestoes",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000043"));

            migrationBuilder.DeleteData(
                table: "Sugestoes",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000044"));

            migrationBuilder.DeleteData(
                table: "Sugestoes",
                keyColumn: "Id",
                keyValue: new Guid("30000000-0000-0000-0000-000000000045"));
        }
    }
}
