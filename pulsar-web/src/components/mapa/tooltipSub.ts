import type { FaixaRisco, SubprefeituraMapaDto } from '../../types';

/**
 * HTML do tooltip glass exibido ao passar o mouse sobre o polígono da
 * subprefeitura. Mostra nome, região, badge de risco + score e as variáveis
 * climáticas num grid 2 colunas. A cor da faixa vem de classes (pt-BAIXO…),
 * para o tema claro poder usar tons mais escuros sem mexer no markup.
 * Usado apenas nos polígonos (o label de score é puramente visual).
 */

/** Chave de faixa usada nas classes de cor do CSS (.pt-BAIXO / .pt-MODERADO…). */
function classeFaixa(faixa: FaixaRisco | null | undefined): string {
  switch (faixa) {
    case 'BAIXO': return 'pt-BAIXO';
    case 'MODERADO': return 'pt-MODERADO';
    case 'ALTO': return 'pt-ALTO';
    default: return 'pt-SEM';
  }
}

/** Texto amigável da faixa de risco. */
function rotuloFaixa(faixa: FaixaRisco | null | undefined): string {
  switch (faixa) {
    case 'BAIXO': return 'Risco baixo';
    case 'MODERADO': return 'Risco moderado';
    case 'ALTO': return 'Risco alto';
    default: return 'Sem dados';
  }
}

function fmt(valor: number | null | undefined, casas: number, sufixo = ''): string {
  if (valor == null) return '—';
  return `${valor.toFixed(casas)}${sufixo}`;
}

function metrica(emoji: string, valor: string): string {
  return `<div class="pt-metric"><span class="pt-ico">${emoji}</span><span class="pt-val">${valor}</span></div>`;
}

export function tooltipSubprefeituraHtml(
  sub: SubprefeituraMapaDto | undefined,
  nomeFallback: string,
): string {
  const nome = sub?.nome ?? nomeFallback ?? 'Subprefeitura';
  const cabecalho = `<div class="pt-head"><div class="pt-titulo">${nome}</div>${
    sub ? `<div class="pt-regiao">Região ${sub.regiaoNome}</div>` : ''
  }</div>`;

  if (!sub) {
    return `<div class="pt">${cabecalho}<div class="pt-vazio">Ainda sem dados</div></div>`;
  }

  const l = sub.ultimaLeitura;
  const cls = classeFaixa(sub.faixaRisco);
  const score = sub.scoreAtual ? String(Math.round(sub.scoreAtual.valor)) : '—';

  return `<div class="pt">
    ${cabecalho}
    <div class="pt-score-row">
      <span class="pt-faixa ${cls}">${rotuloFaixa(sub.faixaRisco)}</span>
      <span class="pt-score ${cls}">${score}</span>
    </div>
    <div class="pt-grid">
      ${metrica('🌡', fmt(l?.temperaturaC, 1, '°C'))}
      ${metrica('🌧', fmt(l?.chuvaMmH, 1, ' mm/h'))}
      ${metrica('💨', l ? `${Math.round(l.ventoKmH)} km/h` : '—')}
      ${metrica('👁', fmt(l?.visibilidadeKm, 1, ' km'))}
      ${metrica('💧', l ? `${Math.round(l.umidade)}%` : '—')}
      ${metrica('☀', l ? String(Math.round(l.indiceUv)) : '—')}
    </div>
  </div>`;
}
