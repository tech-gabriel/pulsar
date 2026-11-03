namespace Pulsar.API.Services.Rota;

/// <summary>Constantes do veredito de rota. Um lugar só para ajustar sem caçar número mágico.</summary>
public static class LimiaresRota
{
    /// <summary>Células da faixa de horas mostrada ao usuário (hora atual mais as próximas).</summary>
    public const int HorasNaFaixa = 4;

    /// <summary>Até quantas horas à frente procuramos uma melhora quando o veredito é esperar.</summary>
    public const int HorizonteEsperaHoras = 12;

    /// <summary>Idade máxima do score de uma subprefeitura para valer como "agora".</summary>
    public const int ScoreVelhoMinutos = 60;

    /// <summary>Validade de um pedido de rota guardado para acompanhamento.</summary>
    public const int ExpiracaoPedidoHoras = 3;
}
