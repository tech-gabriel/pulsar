using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Domain.Score;
using Pulsar.API.DTOs;
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
        // Sem leitura nova (a coleta da área falhou neste ciclo), o retrato seria igual ao
        // anterior: gravar de novo só inflaria a contagem de ciclos da conferência.
        if (await _db.ResumosCelulas.AnyAsync(r => r.SubprefeituraId == subprefeituraId && r.Timestamp == resumo.Timestamp, ct))
            return null;

        _db.ResumosCelulas.Add(resumo);
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch
        {
            // Este contexto é o do ciclo inteiro. Um resumo preso como "a inserir" faria o
            // próximo SaveChanges (agregado, previsão, score da área seguinte) falhar junto.
            _db.Entry(resumo).State = EntityState.Detached;
            throw;
        }
        return resumo;
    }

    public async Task<IReadOnlyList<ResumoGradeAreaDto>> ResumirAsync(int dias, CancellationToken ct = default)
    {
        var desde = DateTime.UtcNow.AddDays(-Math.Clamp(dias, 1, RetencaoDias));
        // Agrupa em memória: no máximo a retenção inteira (uns 180 mil registros pequenos), e
        // a conta por faixa não tem tradução igual em Postgres e SQLite.
        var linhas = await _db.ResumosCelulas.AsNoTracking()
            .Where(r => r.Timestamp >= desde)
            .Select(r => new { r.Subprefeitura.Nome, r.Celulas, r.ValorArea, r.ValorMeioTermo, r.FaixaMeioTermo, r.CelulasAlto })
            .ToListAsync(ct);

        return linhas
            .GroupBy(r => r.Nome)
            .Select(g => new ResumoGradeAreaDto(
                Subprefeitura: g.Key,
                Celulas: g.Max(r => r.Celulas),
                Ciclos: g.Count(),
                MaxValorArea: g.Max(r => r.ValorArea),
                MaxMeioTermo: g.Max(r => r.ValorMeioTermo),
                CiclosAreaAlto: g.Count(r => ClassificacaoRisco.Faixa(r.ValorArea) == FaixaRisco.ALTO),
                CiclosMeioTermoAlto: g.Count(r => r.FaixaMeioTermo == FaixaRisco.ALTO),
                CiclosFaixaDiferente: g.Count(r => ClassificacaoRisco.Faixa(r.ValorArea) != r.FaixaMeioTermo),
                MaxCelulasAlto: g.Max(r => r.CelulasAlto)))
            .OrderByDescending(l => l.CiclosFaixaDiferente)
            .ThenBy(l => l.Subprefeitura, StringComparer.Create(System.Globalization.CultureInfo.GetCultureInfo("pt-BR"), false))
            .ToList();
    }

    public async Task<int> PodarAsync(CancellationToken ct = default)
    {
        var limite = DateTime.UtcNow.AddDays(-RetencaoDias);
        return await _db.ResumosCelulas.Where(r => r.Timestamp < limite).ExecuteDeleteAsync(ct);
    }
}
