using Pulsar.API.Domain.Enums;
using Pulsar.API.Services.Rota;

namespace Pulsar.API.DTOs;

public record PontoRotaDto(double Lat, double Lon);

/// <param name="SubprefeituraIds">1 a 32 subprefeituras, na ordem do caminho.</param>
/// <param name="PontoOrigem">Com o destino, deixa o risco ser lido nos trechos por onde o caminho passa. Os dois ou nenhum.</param>
public record AvaliarRotaRequest(IReadOnlyList<Guid> SubprefeituraIds, PontoRotaDto? PontoOrigem = null, PontoRotaDto? PontoDestino = null);

/// <param name="Destino">Rótulo curto do destino (1 a 80 caracteres), usado na copy do push.</param>
public record PedirAvisoRotaRequest(IReadOnlyList<Guid> SubprefeituraIds, string Destino,
    PontoRotaDto? PontoOrigem = null, PontoRotaDto? PontoDestino = null);

/// <param name="Faixa">Faixa da subprefeitura agora para quem está na rua: a pior entre alagamento e vento (calor fica de fora, então pode diferir do mapa); null sem score recente.</param>
public record TrechoRotaDto(Guid SubprefeituraId, string Nome, FaixaRisco? Faixa, bool AlagandoCge);

public record HoraRotaDto(DateTime InicioUtc, FaixaRisco PiorFaixa);

public record RotaAvaliacaoDto(EstadoRota Estado, Guid? TrechoDecisivoId, DateTime? TranquiloAteUtc,
    DateTime? EsperarAteUtc, IReadOnlyList<TrechoRotaDto> Trechos, IReadOnlyList<HoraRotaDto> Horas);
