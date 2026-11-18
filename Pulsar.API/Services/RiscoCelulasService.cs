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
    public const double RaioEstacaoKm = RiscoTrecho.RaioEstacaoKm;

    private readonly IGradeCelulas _grade;
    private readonly ICemadenService _cemaden;
    private readonly ILogger<RiscoCelulasService> _logger;
    private readonly IEstacaoCgeService? _cge;

    public RiscoCelulasService(PulsarDbContext db, IGradeCelulas grade, ICemadenService cemaden, ILogger<RiscoCelulasService> logger,
        IEstacaoCgeService? cge = null)
    {
        _cge = cge;
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
            _estacoes = await EstacoesMedidas.TodasAsync(_cemaden, _cge, DateTime.UtcNow, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // A chuva medida é complemento: sem ela, o trecho fica com o modelo, como na entrega 1.
            _logger.LogWarning(ex, "Falha ao ler as estações com chuva medida; o risco por trecho segue só com o modelo.");
            _estacoes = [];
        }
        return _estacoes;
    }

    public async Task<AlagamentoArea?> AlagamentoDaAreaAsync(string nomeArea, EntradaScore entrada, CancellationToken ct = default)
    {
        var celulas = _grade.DaArea(nomeArea);
        if (celulas.Count == 0) return null;
        return RiscoTrecho.MeioTermoDaArea(RiscoTrecho.DaArea(entrada, celulas, await EstacoesAsync(ct)));
    }

    public async Task<CelulasAgoraDto> AgoraAsync(bool incluirOcultas = false, CancellationToken ct = default)
    {
        var agora = DateTime.UtcNow;
        var desde = agora.AddHours(-ScoreService.JanelaHoras);
        var areas = await _db.Subprefeituras.AsNoTracking()
            .Where(a => a.Ativa && (incluirOcultas || a.Regiao.Cidade.Publica))
            .Select(a => new { a.Id, a.Nome }).ToListAsync(ct);
        // Uma consulta para a cidade inteira: 32 áreas × 192 leituras de 15 min nas 48 h.
        var leituras = (await _db.LeiturasClimaticas.AsNoTracking().Where(l => l.Timestamp >= desde).ToListAsync(ct))
            .ToLookup(l => l.SubprefeituraId);
        var estacoes = await EstacoesAsync(ct);

        var usadas = new List<EstacaoChuva>();
        var indices = new Dictionary<EstacaoChuva, int>(ReferenceEqualityComparer.Instance);
        var celulas = new List<CelulaAgoraDto>();
        foreach (var area in areas)
        {
            // Área sem leitura recente fica de fora: sem a chuva dela não há o que afirmar do trecho.
            var daArea = leituras[area.Id].ToList();
            if (daArea.Count == 0) continue;
            var entrada = ScoreService.MontarEntrada(area.Nome, daArea);
            foreach (var t in RiscoTrecho.DaArea(entrada, _grade.DaArea(area.Nome), estacoes))
            {
                int? indice = null;
                double? km = null;
                if (t.Estacao is { } e)
                {
                    if (!indices.TryGetValue(e, out var i)) { indices[e] = i = usadas.Count; usadas.Add(e); }
                    indice = i;
                    km = Math.Round(GeoDistancia.HaversineMetros(t.Celula.Lat, t.Celula.Lon, e.Lat, e.Lon) / 1000, 1);
                }
                celulas.Add(new CelulaAgoraDto(t.Celula.H3, area.Id, Math.Round(t.Risco.Valor, 1), t.Risco.Faixa, indice, km));
            }
        }
        // O nome da estação vai junto: o detalhe do trecho mostra de qual estação é a leitura.
        var codigos = usadas.Select(e => e.Cod).ToList();
        var nomes = await _db.EstacoesCemaden.AsNoTracking().Where(e => codigos.Contains(e.CodEstacao))
            .ToDictionaryAsync(e => e.CodEstacao, e => e.Nome, ct);
        foreach (var p in PostosCge.Todos) nomes[EstacaoCgeService.PrefixoCod + p.Id] = p.Nome;
        return new CelulasAgoraDto(agora,
            usadas.Select(e => new EstacaoAgoraDto(e.Cod, e.Mm1h, e.Mm3h, nomes.GetValueOrDefault(e.Cod) ?? e.Cod,
                e.Cod.StartsWith(EstacaoCgeService.PrefixoCod) ? "cge" : "cemaden", e.Lat, e.Lon)).ToList(), celulas);
    }

    public async Task<ResumoCelulas?> RegistrarAsync(Subprefeitura sub, ScorePerigo score, CancellationToken ct = default)
    {
        var celulas = _grade.DaArea(sub.Nome);
        if (celulas.Count == 0) return null;

        var estacoes = await EstacoesAsync(ct);
        var medidas = celulas.Select(c => EstacaoChuva.DoTrecho(c.Lat, c.Lon, estacoes, RaioEstacaoKm)).ToList();

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
        ComponenteScore Alagamento(EntradaScore e, double fator) => CalculadoraScore.Calcular(e, CalibracaoScore.Para(e.Subprefeitura), fator).Alagamento;

        // Três contas por trecho. Modelo: a chuva da área (entrega 1). Medida: a estação
        // substitui o modelo onde existe. Maior: vale a mais alta das duas. Trecho sem
        // estação fica com o modelo nas três.
        var valores = new List<ComponenteScore>(celulas.Count);
        var comMedida = new List<ComponenteScore>(celulas.Count);
        var comMaior = new List<ComponenteScore>(celulas.Count);
        for (var i = 0; i < celulas.Count; i++)
        {
            var modelo = Alagamento(entrada, celulas[i].Fator);
            var medida = medidas[i] is { } m ? RiscoTrecho.ComChuvaMedida(entrada, m, celulas[i].Fator) : modelo;
            valores.Add(modelo);
            comMedida.Add(medida);
            comMaior.Add(medida.Valor > modelo.Valor ? medida : modelo);
        }

        // A conta antiga da área (fator da área inteira). O score gravado já é o meio-termo dos
        // trechos; a conferência continua comparando com o que o app mostrava antes.
        var valorArea = CalculadoraScore.Calcular(entrada).Alagamento.Valor;

        // Área e todos os trechos em risco baixo, nas três contas: não há o que conferir.
        // A tela lê a ausência de linha como "concordaram em risco baixo".
        if (ClassificacaoRisco.Faixa(valorArea) == FaixaRisco.BAIXO
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
            ValorArea = valorArea,
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
