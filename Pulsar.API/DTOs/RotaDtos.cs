using Pulsar.API.Domain.Enums;
using Pulsar.API.Services.Rota;

namespace Pulsar.API.DTOs;

/// <param name="SubprefeituraIds">1 a 32 subprefeituras, na ordem do caminho.</param>
public record AvaliarRotaRequest(IReadOnlyList<Guid> SubprefeituraIds);

public record TrechoRotaDto(Guid SubprefeituraId, string Nome, FaixaRisco? Faixa, bool AlagandoCge);

public record HoraRotaDto(DateTime InicioUtc, FaixaRisco PiorFaixa);

public record RotaAvaliacaoDto(EstadoRota Estado, Guid? TrechoDecisivoId, DateTime? TranquiloAteUtc,
    DateTime? EsperarAteUtc, IReadOnlyList<TrechoRotaDto> Trechos, IReadOnlyList<HoraRotaDto> Horas);
