namespace Pulsar.API.Domain.Entities;

/// <summary>
/// Cadastro de uma estação pluviométrica do CEMADEN: onde ela fica. Atualizado uma vez por dia
/// a partir do PED; a resposta dos acumulados não traz coordenada.
/// </summary>
public class EstacaoCemaden
{
    /// <summary>Código da estação no CEMADEN (ex.: 355030846A).</summary>
    public string CodEstacao { get; set; } = string.Empty;

    /// <summary>Código do IBGE do município, como está em Cemaden:Municipios.</summary>
    public string CodIbge { get; set; } = string.Empty;

    public string Nome { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }

    /// <summary>
    /// Última vez que o cadastro foi conferido no CEMADEN, em UTC. Não se chama AtualizadoEm de
    /// propósito: esse nome o PulsarDbContext carimba sozinho, e só quando a linha muda.
    /// </summary>
    public DateTime ConferidoEm { get; set; }
}
