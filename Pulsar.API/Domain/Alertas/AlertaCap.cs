namespace Pulsar.API.Domain.Alertas;

/// <summary>
/// Um alerta oficial no padrão CAP 1.2, como vem do feed nacional da Defesa Civil (IDAP).
/// Datas em UTC. Polígonos em (lat, lon), como o CAP publica.
/// </summary>
public record AlertaCap(
    string Identificador,
    string Remetente,
    DateTime EnviadoUtc,
    string TipoMensagem,
    IReadOnlyList<string> Referencias,
    string Evento,
    string Gravidade,
    string Urgencia,
    DateTime InicioUtc,
    DateTime ExpiraUtc,
    string Emissor,
    string Titulo,
    string Descricao,
    IReadOnlyList<IReadOnlyList<(double Lat, double Lon)>> Poligonos,
    IReadOnlyList<string> CodigosIbge,
    string Instrucao = "");
