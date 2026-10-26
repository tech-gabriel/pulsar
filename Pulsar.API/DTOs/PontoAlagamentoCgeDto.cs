using System.Globalization;
using Pulsar.API.Domain.Entities;

namespace Pulsar.API.DTOs;

/// <summary>Ponto de alagamento ativo do CGE-SP, como o app mostra no detalhe e no mapa.</summary>
public class PontoAlagamentoCgeDto
{
    public string Via { get; set; } = string.Empty;
    public string Referencia { get; set; } = string.Empty;
    public DateTime InicioUtc { get; set; }
    public bool Transitavel { get; set; }

    private static readonly TextInfo Texto = CultureInfo.GetCultureInfo("pt-BR").TextInfo;

    /// <summary>O CGE escreve tudo em maiúsculas; no app isso parece grito.</summary>
    public static PontoAlagamentoCgeDto De(PontoAlagamentoCge p) => new()
    {
        Via = Texto.ToTitleCase(p.Via.ToLowerInvariant()),
        Referencia = Texto.ToTitleCase(p.Referencia.ToLowerInvariant()),
        InicioUtc = DateTime.SpecifyKind(p.InicioUtc, DateTimeKind.Utc),
        Transitavel = p.Transitavel,
    };
}
