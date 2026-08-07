using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Interfaces;

namespace Pulsar.API.Repositories.Data;

public class OcorrenciaAlagamentoRepository : IOcorrenciaAlagamentoRepository
{
    private readonly PulsarDbContext _context;

    public OcorrenciaAlagamentoRepository(PulsarDbContext context) => _context = context;

    public async Task UpsertRangeAsync(IEnumerable<OcorrenciaAlagamento> ocorrencias)
    {
        // Deduplica o lote de entrada por (CdIdentificador, Tipo), mantendo a última ocorrência.
        // Sem isso, duas linhas com a mesma chave no mesmo lote seriam ambas tratadas como
        // "não encontradas" no banco e ambas seriam adicionadas, estourando o índice único
        // no SaveChangesAsync e derrubando o lote inteiro.
        var unicas = ocorrencias
            .GroupBy(o => (o.CdIdentificador, o.Tipo))
            .Select(g => g.Last());

        foreach (var nova in unicas)
        {
            var existente = await _context.OcorrenciasAlagamento
                .FirstOrDefaultAsync(o => o.CdIdentificador == nova.CdIdentificador && o.Tipo == nova.Tipo);

            if (existente is null)
            {
                await _context.OcorrenciasAlagamento.AddAsync(nova);
            }
            else
            {
                existente.DataOcorrencia = nova.DataOcorrencia;
                existente.Latitude = nova.Latitude;
                existente.Longitude = nova.Longitude;
                existente.NmSubprefeitura = nova.NmSubprefeitura;
                existente.FonteOriginal = nova.FonteOriginal;
                existente.DataCarga = nova.DataCarga;
            }
        }
        await _context.SaveChangesAsync();
    }

    public async Task<IReadOnlyList<OcorrenciaAlagamento>> ObterRecentesAsync(int meses = 12)
    {
        var limite = DateTime.UtcNow.AddMonths(-meses);
        return await _context.OcorrenciasAlagamento
            .Where(o => o.DataOcorrencia >= limite)
            .ToListAsync();
    }
}
