namespace Pulsar.API.DTOs;

public class SalvarLocalResponseDto
{
    public LocalSalvoDto Local { get; set; } = null!;

    /// <summary>"ADICIONADA", "JA_ERA" ou "TETO" (10 favoritas, o endereço foi salvo mesmo assim).</summary>
    public string Favorita { get; set; } = string.Empty;
}
