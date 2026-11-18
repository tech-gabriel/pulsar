using Pulsar.API.Domain.Entities;

namespace Pulsar.API.Repositories.Interfaces;

public interface ISubprefeituraRepository : IRepository<Subprefeitura>
{
    Task<IEnumerable<Subprefeitura>> ObterAtivasAsync();
    Task<Subprefeitura?> ObterComUltimaLeituraAsync(Guid id);

    /// <summary>Subprefeitura com a região carregada (necessário para resolver o fuso).</summary>
    Task<Subprefeitura?> ObterComRegiaoAsync(Guid id);

    /// <summary>Ativas com a região (legenda de zona), o último score e a última leitura.</summary>
    Task<IReadOnlyList<Subprefeitura>> ObterAtivasComResumoAsync();

    /// <summary>
    /// As áreas que o usuário vê: ativas e de cidade pública. <paramref name="incluirOcultas"/>
    /// traz também as de cidade ainda escondida (Baixada em conferência), só para o Admin.
    /// O motor (coleta, score, CEMADEN, avisos) continua usando as ativas.
    /// </summary>
    Task<IReadOnlyList<Subprefeitura>> ObterVisiveisAsync(bool incluirOcultas = false);
    /// <summary>Nomes das cidades que a pessoa enxerga (todas para o Admin): a cobertura da busca e da rua perto.</summary>
    Task<IReadOnlyList<string>> ObterNomesDasCidadesVisiveisAsync(bool incluirOcultas = false);

    /// <summary>Como <see cref="ObterAtivasComResumoAsync"/>, só com as áreas que o usuário vê.</summary>
    Task<IReadOnlyList<Subprefeitura>> ObterVisiveisComResumoAsync(bool incluirOcultas = false);

    /// <summary>Uma área pelo id, só se estiver ativa e visível para quem pede (rotas por id).</summary>
    Task<Subprefeitura?> ObterVisivelAsync(Guid id, bool incluirOcultas = false);
}
