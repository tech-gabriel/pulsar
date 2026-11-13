using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Domain.Score;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

public class RiscoCelulasService : IRiscoCelulasService
{
    // 3.072 linhas por dia (32 áreas × 96 ciclos). Dois meses cobrem uma boa amostra de
    // dias de chuva para a comparação sem deixar a tabela crescer para sempre.
    public const int RetencaoDias = 60;

    private readonly PulsarDbContext _db;
    private readonly IGradeCelulas _grade;

    public RiscoCelulasService(PulsarDbContext db, IGradeCelulas grade)
    {
        _db = db;
        _grade = grade;
    }

    public async Task<ResumoCelulas?> RegistrarAsync(Guid subprefeituraId, CancellationToken ct = default)
    {
        var nome = await _db.Subprefeituras.Where(s => s.Id == subprefeituraId).Select(s => s.Nome).FirstOrDefaultAsync(ct);
        if (nome is null) return null;

        var celulas = _grade.DaArea(nome);
        if (celulas.Count == 0) return null;

        // Mesma janela e mesma montagem do score da área: a chuva é a da área, só o fator muda.
        var desde = DateTime.UtcNow.AddHours(-ScoreService.JanelaHoras);
        var leituras = await _db.LeiturasClimaticas.AsNoTracking()
            .Where(l => l.SubprefeituraId == subprefeituraId && l.Timestamp >= desde)
            .ToListAsync(ct);
        if (leituras.Count == 0) return null;

        var entrada = ScoreService.MontarEntrada(nome, leituras);
        var valores = celulas
            .Select(c => CalculadoraScore.Calcular(entrada, CalibracaoScore.Atual, c.Fator).Alagamento)
            .ToList();
        var meioTermo = MeioTermo.Calcular(valores.Select(v => v.Valor).ToList());

        var resumo = new ResumoCelulas
        {
            SubprefeituraId = subprefeituraId,
            Timestamp = leituras.Max(l => l.Timestamp),
            ValorArea = CalculadoraScore.Calcular(entrada).Alagamento.Valor,
            ValorMeioTermo = meioTermo,
            FaixaMeioTermo = ClassificacaoRisco.Faixa(meioTermo),
            ValorMaximo = valores.Max(v => v.Valor),
            Celulas = valores.Count,
            CelulasModerado = valores.Count(v => v.Faixa == FaixaRisco.MODERADO),
            CelulasAlto = valores.Count(v => v.Faixa == FaixaRisco.ALTO),
        };
        _db.ResumosCelulas.Add(resumo);
        await _db.SaveChangesAsync(ct);
        return resumo;
    }

    public async Task<int> PodarAsync(CancellationToken ct = default)
    {
        var limite = DateTime.UtcNow.AddDays(-RetencaoDias);
        return await _db.ResumosCelulas.Where(r => r.Timestamp < limite).ExecuteDeleteAsync(ct);
    }
}
