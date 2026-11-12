using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;

namespace Pulsar.API.DTOs;

public class SubprefeituraDto
{
    public Guid Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public ScoreDto? ScoreAtual { get; set; }
    public FaixaRisco FaixaRisco { get; set; }
    public double TemperaturaAtual { get; set; }
    public LeituraDto? UltimaLeitura { get; set; }

    /// <summary>Pontos de alagamento ativos agora segundo o CGE-SP. Vazio quando não há (ou o CGE está fora).</summary>
    public IReadOnlyList<PontoAlagamentoCgeDto> AlagamentosCge { get; set; } = [];

    /// <summary>Chuva medida por posto do CGE-SP ou, na falta dele, por estação do CEMADEN. Null quando a região só tem chuva estimada agora.</summary>
    public ChuvaMedidaDto? ChuvaMedida { get; set; }

    /// <summary>Chuva das últimas 24 horas medida pelo CEMADEN. Null sem estação com dado por perto.</summary>
    public Chuva24hDto? Chuva24h { get; set; }

    /// <summary>Preenche os campos comuns a partir da entidade (último score e última leitura).</summary>
    public static T Preencher<T>(T dto, Subprefeitura sub) where T : SubprefeituraDto
    {
        var ultimoScore = sub.GetUltimoScore();
        var ultimaLeitura = sub.GetUltimaLeitura();

        dto.Id = sub.Id;
        dto.Nome = sub.Nome;
        dto.Latitude = sub.Latitude;
        dto.Longitude = sub.Longitude;
        dto.FaixaRisco = ultimoScore?.Faixa ?? FaixaRisco.BAIXO;
        dto.TemperaturaAtual = ultimaLeitura?.TemperaturaC ?? 0.0;
        dto.ScoreAtual = ultimoScore is null ? null : ScoreDto.De(ultimoScore);
        dto.UltimaLeitura = ultimaLeitura is null ? null : new LeituraDto
        {
            ChuvaMmH = ultimaLeitura.ChuvaMmH,
            VentoKmH = ultimaLeitura.VentoKmH,
            VisibilidadeKm = ultimaLeitura.VisibilidadeKm,
            IndiceUv = ultimaLeitura.IndiceUv,
            TemperaturaC = ultimaLeitura.TemperaturaC,
            SensacaoTermica = ultimaLeitura.SensacaoTermica,
            Umidade = ultimaLeitura.Umidade,
            Timestamp = ultimaLeitura.Timestamp
        };
        return dto;
    }
}
