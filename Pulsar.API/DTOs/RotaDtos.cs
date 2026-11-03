using Pulsar.API.Domain.Enums;
using Pulsar.API.Services.Rota;

namespace Pulsar.API.DTOs;

/// <param name="SubprefeituraIds">1 a 32 subprefeituras, na ordem do caminho.</param>
public record AvaliarRotaRequest(IReadOnlyList<Guid> SubprefeituraIds);

/// <param name="Destino">Rótulo curto do destino (1 a 80 caracteres), usado na copy do push.</param>
public record PedirAvisoRotaRequest(IReadOnlyList<Guid> SubprefeituraIds, string Destino);

/// <param name="Faixa">Faixa da subprefeitura agora para quem está na rua: a pior entre alagamento e vento (calor fica de fora, então pode diferir do mapa); null sem score recente.</param>
public record TrechoRotaDto(Guid SubprefeituraId, string Nome, FaixaRisco? Faixa, bool AlagandoCge);

public record HoraRotaDto(DateTime InicioUtc, FaixaRisco PiorFaixa);

public record RotaAvaliacaoDto(EstadoRota Estado, Guid? TrechoDecisivoId, DateTime? TranquiloAteUtc,
    DateTime? EsperarAteUtc, IReadOnlyList<TrechoRotaDto> Trechos, IReadOnlyList<HoraRotaDto> Horas);
