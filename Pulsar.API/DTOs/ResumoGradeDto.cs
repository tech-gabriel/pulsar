namespace Pulsar.API.DTOs;

/// <summary>
/// Comparação, numa janela de dias, entre o alagamento da área pelo cálculo atual e pelo
/// meio-termo das células da grade. Uma linha por área. Só para conferência do admin.
/// </summary>
/// <param name="Subprefeitura">Nome da área.</param>
/// <param name="Celulas">Quantas células da grade a área tem.</param>
/// <param name="Ciclos">Ciclos de coleta com resumo na janela.</param>
/// <param name="MaxValorArea">Maior alagamento da área pelo cálculo atual.</param>
/// <param name="MaxMeioTermo">Maior alagamento da área pelo meio-termo das células.</param>
/// <param name="CiclosAreaAlto">Ciclos em que o cálculo atual deu Alerta.</param>
/// <param name="CiclosMeioTermoAlto">Ciclos em que o meio-termo deu Alerta.</param>
/// <param name="CiclosFaixaDiferente">Ciclos em que os dois cálculos caíram em faixas diferentes.</param>
/// <param name="MaxCelulasAlto">Maior número de células em Alerta num mesmo ciclo.</param>
public record ResumoGradeAreaDto(
    string Subprefeitura,
    int Celulas,
    int Ciclos,
    double MaxValorArea,
    double MaxMeioTermo,
    int CiclosAreaAlto,
    int CiclosMeioTermoAlto,
    int CiclosFaixaDiferente,
    int MaxCelulasAlto);
