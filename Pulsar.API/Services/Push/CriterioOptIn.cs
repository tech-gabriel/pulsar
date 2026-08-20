namespace Pulsar.API.Services.Push;

/// <summary>
/// Por qual preferência da AssinaturaPush este envio é filtrado. Não é a mesma coisa
/// que faixa de risco: o resumo diário é um tipo de envio, não um nível de perigo.
/// </summary>
public enum CriterioOptIn
{
    RiscoAlto,
    RiscoModerado,
    ResumoDiario
}
