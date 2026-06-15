import type { FaixaRisco, SubprefeituraMapaDto } from '../../types';

/**
 * HTML do tooltip dark/glass exibido ao passar o mouse sobre o polígono da
 * subprefeitura (ETAPA 3 — redesign). Mostra nome completo, região, score com
 * a cor da faixa e todas as variáveis climáticas. Usado apenas nos polígonos
 * (o label de score é puramente visual), evitando tooltips duplicados.
 */

/**
 * Cor do número do score DENTRO do tooltip (fundo sempre escuro). Usa tons mais
 * claros (nível 400) que os do polígono (`coresParaFaixa().fill`), garantindo
 * contraste/legibilidade sobre o fundo escuro do tooltip.
 */
function corScoreTooltip(faixa: FaixaRisco | null | undefined): string {
  switch (faixa) {
    case 'BAIXO':
      return '#4ade80';
    case 'MODERADO':
      return '#fbbf24';
    case 'ALTO':
      return '#f87171';
    default:
      return '#cbd5e1';
  }
}

function fmt(valor: number | null | undefined, casas: number, sufixo = ''): string {
  if (valor == null) return '—';
  return `${valor.toFixed(casas)}${sufixo}`;
}

function linha(emoji: string, label: string, valor: string): string {
  return `<div style="display:flex;justify-content:space-between;font-size:12.5px;gap:12px;">
    <span style="color:var(--text-secondary);">${emoji} ${label}</span>
    <span style="color:var(--text-primary);font-family:'JetBrains Mono',monospace;font-weight:600;">${valor}</span>
  </div>`;
}

export function tooltipSubprefeituraHtml(
  sub: SubprefeituraMapaDto | undefined,
  nomeFallback: string,
): string {
  const nome = sub?.nome ?? nomeFallback ?? 'Subprefeitura';

  const cabecalho = `<div style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:600;font-size:14px;color:var(--text-primary);margin-bottom:4px;">${nome}</div>`;

  if (!sub) {
    return `<div style="font-family:'DM Sans',sans-serif;">
      ${cabecalho}
      <div style="font-size:12px;color:var(--text-secondary);">Sem dados no momento</div>
    </div>`;
  }

  const l = sub.ultimaLeitura;
  const cor = corScoreTooltip(sub.faixaRisco);
  const score = sub.scoreAtual ? String(Math.round(sub.scoreAtual.valor)) : '—';

  return `<div style="font-family:'DM Sans',sans-serif;">
    ${cabecalho}
    <div style="font-size:11px;color:var(--text-secondary);margin-bottom:8px;">Região ${sub.regiaoNome}</div>
    <div style="height:1px;background:linear-gradient(to right, transparent, var(--border-glass-hover), transparent);margin-bottom:8px;"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
      <span style="color:var(--text-secondary);font-size:12px;">Score</span>
      <span style="font-family:'JetBrains Mono',monospace;font-weight:800;font-size:17px;color:${cor};text-shadow:0 0 10px ${cor}66;">${score}</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:3px;">
      ${linha('🌡', 'Temperatura', fmt(l?.temperaturaC, 1, '°C'))}
      ${linha('🌧', 'Chuva', fmt(l?.chuvaMmH, 1, ' mm/h'))}
      ${linha('💨', 'Vento', l ? `${Math.round(l.ventoKmH)} km/h` : '—')}
      ${linha('👁', 'Visibilidade', fmt(l?.visibilidadeKm, 1, ' km'))}
      ${linha('☀', 'UV', l ? String(Math.round(l.indiceUv)) : '—')}
    </div>
  </div>`;
}
