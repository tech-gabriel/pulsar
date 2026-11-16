using Pulsar.API.Domain.Enums;

namespace Pulsar.API.DTOs;

/// <summary>
/// Estação com chuva medida que mandou na conta de algum trecho. Nome: o do cadastro do CEMADEN
/// ou o do posto do CGE (o código, se faltar). Fonte: "cemaden" ou "cge". Lat/Lon: onde ela fica,
/// para o mapa marcar o ponto da medida.
/// </summary>
public record EstacaoAgoraDto(string Cod, double Mm1h, double Mm3h, string Nome = "", string Fonte = "cemaden", double Lat = 0, double Lon = 0);

/// <summary>
/// Risco de alagamento de um trecho da grade agora.
/// </summary>
/// <param name="Estacao">Índice em <see cref="CelulasAgoraDto.Estacoes"/>; null = sem estação a até 5 km, vale a chuva estimada.</param>
/// <param name="DistanciaKm">Do centro do trecho até a estação.</param>
public record CelulaAgoraDto(string H3, Guid AreaId, double Valor, FaixaRisco Faixa, int? Estacao, double? DistanciaKm);

/// <summary>O risco atual de todos os trechos da cidade.</summary>
public record CelulasAgoraDto(DateTime CalculadoEm, IReadOnlyList<EstacaoAgoraDto> Estacoes, IReadOnlyList<CelulaAgoraDto> Celulas);
