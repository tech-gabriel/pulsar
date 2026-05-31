import type { SubprefeituraMapaDto } from '../../types';
import { metricasSubprefeitura, type Camada } from '../../utils/camadas';

/**
 * HTML do tooltip dark exibido ao passar o mouse sobre o label de score ou
 * sobre o polígono da subprefeitura (ETAPA 2.5/2.6 + ETAPA 3.5).
 *
 * A variável da camada ativa aparece primeiro e em destaque; as demais
 * aparecem abaixo em tamanho menor.
 */
export function tooltipSubprefeituraHtml(
  sub: SubprefeituraMapaDto | undefined,
  nomeFallback: string,
  camadaAtiva: Camada = 'score',
): string {
  const nome = sub?.nome ?? nomeFallback ?? 'Subprefeitura';

  if (!sub) {
    return `
      <div class="pt-titulo">${nome}</div>
      <div class="pt-linha">Sem dados no momento</div>
    `;
  }

  const metricas = metricasSubprefeitura(sub);
  const ativa = metricas.find((m) => m.camada === camadaAtiva);
  const demais = metricas.filter((m) => m.camada !== camadaAtiva);

  const linhaDestaque = ativa
    ? `<div class="pt-linha pt-destaque">${ativa.label}: <span class="pt-mono">${ativa.valor}</span></div>`
    : '';
  const linhasSec = demais
    .map((m) => `<div class="pt-linha pt-sec">${m.label}: <span class="pt-mono">${m.valor}</span></div>`)
    .join('');

  return `
    <div class="pt-titulo">${nome}</div>
    ${linhaDestaque}
    ${linhasSec}
  `;
}
