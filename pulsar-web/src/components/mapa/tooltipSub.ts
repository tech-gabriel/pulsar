import type { FaixaRisco, SubprefeituraMapaDto } from '../../types';
import { labelFaixa, motivoPerigo } from '../../utils/risco';

/**
 * HTML do tooltip ao passar o mouse sobre o polígono da subprefeitura (redesenho 11/2026):
 * nome e zona, o score, a faixa e uma linha com temperatura, chuva e vento. É uma prévia;
 * umidade, UV e visibilidade ficam no detalhe, a um clique. A cor da faixa vem de classes
 * (pt-BAIXO…), para o tema claro usar tons mais escuros sem mexer no markup.
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

// Ícones do lucide (thermometer, cloud-rain, wind), copiados porque o tooltip é HTML puro.
const svg = (paths: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const ICONE = {
  temperatura: svg('<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>'),
  chuva: svg('<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/>'),
  vento: svg('<path d="M12.8 19.6A2 2 0 1 0 14 16H2"/><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"/><path d="M9.8 4.4A2 2 0 1 1 11 8H2"/>'),
};

/** Número em pt-BR (vírgula decimal), sem casa quando é inteiro. */
const num = (v: number, casas: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: casas });

/** Texto vindo do banco vai para innerHTML: escapa antes, mesmo que hoje seja só seed. */
function esc(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function tooltipSubprefeituraHtml(
  sub: SubprefeituraMapaDto | undefined,
  nomeFallback: string,
): string {
  const nome = esc(sub?.nome ?? nomeFallback ?? 'Subprefeitura');
  const cls = classeFaixa(sub?.faixaRisco);
  const score = sub?.scoreAtual ? `<span class="pt-score ${cls}">${Math.round(sub.scoreAtual.valor)}</span>` : '';
  const cabecalho = `<div class="pt-head"><div><div class="pt-titulo">${nome}</div>${
    sub ? `<div class="pt-regiao">Zona ${esc(sub.zona)}</div>` : ''
  }</div>${score}</div>`;

  if (!sub) {
    return `<div class="pt">${cabecalho}<div class="pt-vazio">Ainda sem dados</div></div>`;
  }

  const l = sub.ultimaLeitura;
  const motivo = motivoPerigo(sub.scoreAtual?.perigoPrincipal, sub.faixaRisco);
  const pontosCge = sub.alagamentosCge?.length ?? 0;
  // Dado oficial, não estimativa: aparece em vermelho mesmo com o score baixo.
  const linhaCge = pontosCge === 0 ? '' : `<div class="pt-cge pt-ALTO">${
    pontosCge === 1 ? 'Alagamento agora' : `${pontosCge} pontos de alagamento agora`
  }, segundo o CGE</div>`;
  const linha = l
    ? `<div class="pt-linha"><span>${ICONE.temperatura}${num(l.temperaturaC, 1)} °C</span><span>${ICONE.chuva}${num(l.chuvaMmH, 1)} mm/h</span><span>${ICONE.vento}${num(l.ventoKmH, 0)} km/h</span></div>`
    : '<div class="pt-vazio">Sem leitura recente</div>';

  return `<div class="pt">
    ${cabecalho}
    <div class="pt-score-row">
      <span class="pt-faixa ${cls}">${labelFaixa(sub.faixaRisco)}</span>
      ${motivo ? `<span class="pt-motivo">por ${motivo.rotulo}</span>` : ''}
    </div>
    ${linhaCge}
    ${linha}
  </div>`;
}
