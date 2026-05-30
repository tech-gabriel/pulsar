import type { SubprefeituraMapaDto } from '../../types';
import { labelFaixa, scoreFormatado } from '../../utils/risco';

/**
 * HTML do tooltip dark exibido ao passar o mouse sobre o label de score ou
 * sobre o polígono da subprefeitura (ETAPA 2.5/2.6).
 * Mostra: nome, score (faixa), temperatura e chuva.
 */
export function tooltipSubprefeituraHtml(
  sub: SubprefeituraMapaDto | undefined,
  nomeFallback: string,
): string {
  const nome = sub?.nome ?? nomeFallback ?? 'Subprefeitura';

  if (!sub) {
    return `
      <div class="pt-titulo">${nome}</div>
      <div class="pt-linha">Sem dados no momento</div>
    `;
  }

  const score = sub.scoreAtual?.valor;
  const temp = sub.temperaturaAtual ?? sub.ultimaLeitura?.temperaturaC;
  const chuva = sub.ultimaLeitura?.chuvaMmH;

  return `
    <div class="pt-titulo">${nome}</div>
    <div class="pt-linha">Score: <span class="pt-mono">${scoreFormatado(score)}</span> (${labelFaixa(sub.faixaRisco)})</div>
    <div class="pt-linha">Temperatura: <span class="pt-mono">${temp != null ? temp.toFixed(1) : '—'}</span>°C</div>
    <div class="pt-linha">Chuva: <span class="pt-mono">${chuva != null ? chuva.toFixed(1) : '—'}</span> mm/h</div>
  `;
}
