using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Chuva;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Domain.Score;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

public class RiscoCelulasService : IRiscoCelulasService
{
    // Só há linha em ciclo com risco (área ou algum trecho fora do baixo): no pior dia
    // seriam 3.072 (32 áreas × 96 ciclos), no ano típico uma fração pequena disso. Dois
    // meses cobrem uma boa amostra de dias de chuva sem a tabela crescer para sempre.
    public const int RetencaoDias = 60;

    private readonly PulsarDbContext _db;
    /// <summary>
    /// Até onde uma estação ainda fala pelo trecho (do centro da célula). Metade do raio que a
    /// tela usa para a área inteira: o trecho tem 900 m e a chuva de verão muda em poucos km.
    /// </summary>
    public const double RaioEstacaoKm = 5.0;

    private readonly IGradeCelulas _grade;
    private readonly ICemadenService _cemaden;
    private readonly ILogger<RiscoCelulasService> _logger;

    public RiscoCelulasService(PulsarDbContext db, IGradeCelulas grade, ICemadenService cemaden, ILogger<RiscoCelulasService> logger)
    {
        _db = db;
        _grade = grade;
        _cemaden = cemaden;
        _logger = logger;
    }

    // Uma leitura das estações por ciclo: o serviço é criado por ciclo e chamado uma vez por área.
    private IReadOnlyList<EstacaoChuva>? _estacoes;

    private async Task<IReadOnlyList<EstacaoChuva>> EstacoesAsync(CancellationToken ct)
    {
        if (_estacoes is not null) return _estacoes;
        try
        {
            _estacoes = await _cemaden.ObterEstacoesComChuvaAsync(DateTime.UtcNow, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // A chuva medida é complemento: sem ela, o trecho fica com o modelo, como na entrega 1.
            _logger.LogWarning(ex, "Falha ao ler as estações com chuva medida; o risco por trecho segue só com o modelo.");
            _estacoes = [];
        }
        return _estacoes;
    }

    public async Task<ResumoCelulas?> RegistrarAsync(Subprefeitura sub, ScorePerigo score, CancellationToken ct = default)
    {
        var celulas = _grade.DaArea(sub.Nome);
        if (celulas.Count == 0) return null;

        var estacoes = await EstacoesAsync(ct);
        var medidas = celulas.Select(c => EstacaoChuva.MaisProxima(c.Lat, c.Lon, estacoes, RaioEstacaoKm)).ToList();

        // Sem chuva nas 48 h do modelo e sem chuva medida perto, o alagamento é zero em
        // qualquer trecho. É a maior parte do ano: sair aqui poupa a leitura do banco e 32
        // linhas de zeros a cada ciclo. A estação entra na pergunta porque o caso que mais
        // interessa é justamente o modelo seco com chuva medida.
        if (score.Chuva48hMm <= 0 && !medidas.Any(m => m?.Mm3h > 0)) return null;

        // Mesma janela e mesma montagem do score da área.
        var desde = DateTime.UtcNow.AddHours(-ScoreService.JanelaHoras);
        var leituras = await _db.LeiturasClimaticas.AsNoTracking()
            .Where(l => l.SubprefeituraId == sub.Id && l.Timestamp >= desde)
            .ToListAsync(ct);
        if (leituras.Count == 0) return null;

        var entrada = ScoreService.MontarEntrada(sub.Nome, leituras);
        // O risco do trecho é a chuva do momento com o fator da área. O histórico de alagamento
        // do trecho (CelulaGrade.Fator) fica guardado na grade e não entra na conta: o que
        // separa um trecho do vizinho é a chuva medida ali.
        ComponenteScore Alagamento(EntradaScore e) => CalculadoraScore.Calcular(e).Alagamento;
        var modelo = Alagamento(entrada);

        // Três contas por trecho. Modelo: a chuva da área. Medida: a estação substitui o
        // modelo onde existe. Maior: vale a mais alta das duas. Trecho sem estação fica
        // com o modelo nas três.
        var valores = new List<ComponenteScore>(celulas.Count);
        var comMedida = new List<ComponenteScore>(celulas.Count);
        var comMaior = new List<ComponenteScore>(celulas.Count);
        for (var i = 0; i < celulas.Count; i++)
        {
            var medida = medidas[i] is { } m
                ? Alagamento(entrada with { Chuva1hMm = m.Mm1h, Chuva3hMm = m.Mm3h, Chuva48hMm = m.Mm48h ?? entrada.Chuva48hMm })
                : modelo;
            valores.Add(modelo);
            comMedida.Add(medida);
            comMaior.Add(medida.Valor > modelo.Valor ? medida : modelo);
        }

        // Área e todos os trechos em risco baixo, nas três contas: não há o que conferir.
        // A tela lê a ausência de linha como "concordaram em risco baixo".
        if (ClassificacaoRisco.Faixa(score.ValorAlagamento) == FaixaRisco.BAIXO
            && valores.Concat(comMedida).All(v => v.Faixa == FaixaRisco.BAIXO))
            return null;

        // Sem leitura nova (a coleta da área falhou neste ciclo), o retrato seria igual ao
        // anterior. O índice único do banco é a rede de segurança desta checagem.
        if (await _db.ResumosCelulas.AnyAsync(r => r.SubprefeituraId == sub.Id && r.Timestamp == score.Timestamp, ct))
            return null;

        var meioTermo = MeioTermo.Calcular(valores.Select(v => v.Valor).ToList());
        var resumo = new ResumoCelulas
        {
            SubprefeituraId = sub.Id,
            Timestamp = score.Timestamp,
            ValorArea = score.ValorAlagamento,
            ValorMeioTermo = meioTermo,
            FaixaMeioTermo = ClassificacaoRisco.Faixa(meioTermo),
            ValorMaximo = valores.Max(v => v.Valor),
            Celulas = valores.Count,
            CelulasModerado = valores.Count(v => v.Faixa == FaixaRisco.MODERADO),
            CelulasAlto = valores.Count(v => v.Faixa == FaixaRisco.ALTO),
            CelulasComMedida = medidas.Count(m => m is not null),
            ValorMeioTermoMedida = MeioTermo.Calcular(comMedida.Select(v => v.Valor).ToList()),
            CelulasAltoMedida = comMedida.Count(v => v.Faixa == FaixaRisco.ALTO),
            ValorMeioTermoMaior = MeioTermo.Calcular(comMaior.Select(v => v.Valor).ToList()),
            CelulasAltoMaior = comMaior.Count(v => v.Faixa == FaixaRisco.ALTO),
            Chuva3hModeloMm = entrada.Chuva3hMm,
            Chuva3hMedidaMm = medidas.Any(m => m is not null) ? medidas.OfType<EstacaoChuva>().Average(m => m.Mm3h) : null,
        };
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
        // Agrupa em memória: só existem linhas de ciclos com risco (poucos milhares na
        // retenção inteira), e a conta por faixa não tem tradução igual em Postgres e SQLite.
        var linhas = await _db.ResumosCelulas.AsNoTracking()
            .Where(r => r.Timestamp >= desde)
            .Select(r => new
            {
                r.Subprefeitura.Nome, r.Celulas, r.ValorArea, r.ValorMeioTermo, r.FaixaMeioTermo, r.CelulasAlto,
                r.CelulasComMedida, r.Chuva3hModeloMm, r.Chuva3hMedidaMm, r.ValorMeioTermoMedida, r.ValorMeioTermoMaior,
            })
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
                MaxCelulasAlto: g.Max(r => r.CelulasAlto),
                MaxCelulasComMedida: g.Max(r => r.CelulasComMedida),
                MaxChuva3hModeloMm: g.Max(r => r.Chuva3hModeloMm),
                MaxChuva3hMedidaMm: g.Max(r => r.Chuva3hMedidaMm),
                MaxMeioTermoMedida: g.Max(r => r.ValorMeioTermoMedida),
                MaxMeioTermoMaior: g.Max(r => r.ValorMeioTermoMaior),
                CiclosMedidaAlto: g.Count(r => ClassificacaoRisco.Faixa(r.ValorMeioTermoMedida) == FaixaRisco.ALTO),
                CiclosMaiorAlto: g.Count(r => ClassificacaoRisco.Faixa(r.ValorMeioTermoMaior) == FaixaRisco.ALTO)))
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
