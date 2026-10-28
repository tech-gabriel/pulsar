import type { FaixaRisco, SubprefeituraMapaDto } from '../../types';
import { labelFaixa, motivoPerigo } from '../../utils/risco';

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

function fmt(valor: number | null | undefined, casas: number, sufixo = ''): string {
  if (valor == null) return '—';
  return `${valor.toFixed(casas)}${sufixo}`;
}

function metrica(emoji: string, valor: string): string {
  return `<div class="pt-metric"><span class="pt-ico">${emoji}</span><span class="pt-val">${valor}</span></div>`;
}

/** Texto vindo do banco vai para innerHTML: escapa antes, mesmo que hoje seja só seed. */
function esc(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function tooltipSubprefeituraHtml(
  sub: SubprefeituraMapaDto | undefined,
  nomeFallback: string,
): string {
  const nome = esc(sub?.nome ?? nomeFallback ?? 'Subprefeitura');
  const cabecalho = `<div class="pt-head"><div class="pt-titulo">${nome}</div>${
    sub ? `<div class="pt-regiao">Zona ${esc(sub.zona)}</div>` : ''
  }</div>`;

  if (!sub) {
    return `<div class="pt">${cabecalho}<div class="pt-vazio">Ainda sem dados</div></div>`;
  }

  const l = sub.ultimaLeitura;
  const cls = classeFaixa(sub.faixaRisco);
  const score = sub.scoreAtual ? String(Math.round(sub.scoreAtual.valor)) : '—';
  const motivo = motivoPerigo(sub.scoreAtual?.perigoPrincipal, sub.faixaRisco);
  const pontosCge = sub.alagamentosCge?.length ?? 0;
  // Dado oficial, não estimativa: aparece em vermelho mesmo com o score baixo.
  const linhaCge = pontosCge === 0 ? '' : `<div class="pt-cge pt-ALTO">⚠ ${
    pontosCge === 1 ? 'Alagamento agora' : `${pontosCge} pontos de alagamento agora`
  }, segundo o CGE</div>`;

  return `<div class="pt">
    ${cabecalho}
    <div class="pt-score-row">
      <span class="pt-faixa ${cls}">${labelFaixa(sub.faixaRisco)}</span>
      ${motivo ? `<span class="pt-motivo">${motivo.icone} por ${motivo.rotulo}</span>` : ''}
      <span class="pt-score ${cls}">${score}</span>
    </div>
    ${linhaCge}
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
