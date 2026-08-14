using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

/// <summary>
/// Escreve o agregado diário dentro do ciclo de coleta, enquanto o dado bruto ainda
/// existe. Um job noturno não serviria: a limpeza é janela móvel aplicada a cada
/// coleta, então à meia-noite o começo do dia anterior já foi apagado.
/// </summary>
public class AgregadoDiarioService : IAgregadoDiarioService
{
    // Precisa cobrir hoje e ontem inteiros em qualquer fuso. Casado com a retenção
    // de 72h das leituras: se a retenção encolher, o recálculo passa a ler dia
    // truncado e grava a menos, em silêncio.
    private const int JanelaHoras = 72;

    private readonly ISubprefeituraRepository _subprefeituraRepo;
    private readonly ILeituraRepository _leituraRepo;
    private readonly IScoreRepository _scoreRepo;
    private readonly IAgregadoDiarioRepository _agregadoRepo;
    private readonly ILogger<AgregadoDiarioService> _logger;

    public AgregadoDiarioService(
        ISubprefeituraRepository subprefeituraRepo,
        ILeituraRepository leituraRepo,
        IScoreRepository scoreRepo,
        IAgregadoDiarioRepository agregadoRepo,
        ILogger<AgregadoDiarioService> logger)
    {
        _subprefeituraRepo = subprefeituraRepo;
        _leituraRepo = leituraRepo;
        _scoreRepo = scoreRepo;
        _agregadoRepo = agregadoRepo;
        _logger = logger;
    }

    public async Task AtualizarRecentesAsync(Guid subprefeituraId, CancellationToken ct = default)
    {
        var sub = await _subprefeituraRepo.ObterComRegiaoAsync(subprefeituraId)
            ?? throw new InvalidOperationException($"Subprefeitura {subprefeituraId} não encontrada.");

        var fusoId = sub.Regiao.FusoHorario;
        var tz = TimeZoneInfo.FindSystemTimeZoneById(fusoId);

        var leituras = (await _leituraRepo.ObterHistoricoAsync(subprefeituraId, JanelaHoras)).ToList();
        if (leituras.Count == 0) return;

        var scores = (await _scoreRepo.ObterHistoricoAsync(subprefeituraId, JanelaHoras)).ToList();

        var hojeLocal = DiaLocal(DateTime.UtcNow, tz);
        var ontemLocal = hojeLocal.AddDays(-1);

        foreach (var dia in new[] { ontemLocal, hojeLocal })
        {
            // Só hoje e ontem. Dias mais antigos estão apenas parcialmente dentro da
            // janela retida, e gravá-los sobrescreveria uma linha completa por um
            // total menor, sem deixar rastro.
            var leiturasDoDia = leituras.Where(l => DiaLocal(l.Timestamp, tz) == dia).ToList();
            if (leiturasDoDia.Count == 0) continue;

            var scoresDoDia = scores.Where(s => DiaLocal(s.Timestamp, tz) == dia).ToList();

            await _agregadoRepo.UpsertAsync(new AgregadoDiario
            {
                SubprefeituraId = subprefeituraId,
                Dia = dia,
                FusoHorario = fusoId,
                // Leitura de 15 min: mm/h * 0,25h. Estimativa, e o LeiturasCount deixa auditável.
                ChuvaTotalMm = leiturasDoDia.Sum(l => l.ChuvaMmH) * 0.25,
                LeiturasCount = leiturasDoDia.Count,
                VentoMaxKmH = leiturasDoDia.Max(l => l.VentoKmH),
                TemperaturaMinC = leiturasDoDia.Min(l => l.TemperaturaC),
                TemperaturaMaxC = leiturasDoDia.Max(l => l.TemperaturaC),
                UvMax = leiturasDoDia.Max(l => l.IndiceUv),
                ScoreMin = scoresDoDia.Count > 0 ? scoresDoDia.Min(s => s.Valor) : 0,
                ScoreMedio = scoresDoDia.Count > 0 ? scoresDoDia.Average(s => s.Valor) : 0,
                ScoreMax = scoresDoDia.Count > 0 ? scoresDoDia.Max(s => s.Valor) : 0,
                LeiturasBaixo = scoresDoDia.Count(s => s.Faixa == FaixaRisco.BAIXO),
                LeiturasModerado = scoresDoDia.Count(s => s.Faixa == FaixaRisco.MODERADO),
                LeiturasAlto = scoresDoDia.Count(s => s.Faixa == FaixaRisco.ALTO),
            });
        }

        _logger.LogDebug("Agregado diário atualizado para {Nome} ({Fuso}).", sub.Nome, fusoId);
    }

    // Sempre UTC -> local. O caminho inverso não é seguro: em zona cujo horário de
    // verão vira à meia-noite, a meia-noite local não existe naquele dia e a
    // conversão lança. Era assim o horário de verão brasileiro antes de 2019.
    private static DateOnly DiaLocal(DateTime instanteUtc, TimeZoneInfo tz)
        => DateOnly.FromDateTime(
            TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(instanteUtc, DateTimeKind.Utc), tz));
}
