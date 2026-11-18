namespace Pulsar.API.DTOs;

/// <summary>
/// Subprefeitura na lista única do app (SP3). A zona é só legenda: o app não navega
/// mais por ela. No E1, vira um agrupamento opcional da área dentro da cidade.
/// </summary>
public class SubprefeituraResumoDto : SubprefeituraDto
{
    public string Zona { get; set; } = string.Empty;

    /// <summary>Cidade da área ("São Paulo", "Baixada Santista"): o app escreve o lugar por ela.</summary>
    public string Cidade { get; set; } = string.Empty;
}
