import type { Feature, Polygon } from 'geojson';

const METROS_POR_GRAU = 111320;

/** Círculo em metros reais (o MapLibre não tem círculo métrico): polígono fechado de `passos` lados. */
export function circuloGeojson(lat: number, lon: number, raioM: number, passos = 64): Feature<Polygon> {
  const dLat = raioM / METROS_POR_GRAU;
  const dLon = raioM / (METROS_POR_GRAU * Math.cos((lat * Math.PI) / 180));
  const anel: [number, number][] = [];
  for (let i = 0; i < passos; i++) {
    const a = (i / passos) * 2 * Math.PI;
    anel.push([lon + dLon * Math.sin(a), lat + dLat * Math.cos(a)]);
  }
  anel.push(anel[0]);
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [anel] } };
}

export interface Padding { top: number; right: number; bottom: number; left: number }

/**
 * Quanto do mapa o painel flutuante cobre (celular e tablet: no pé; computador: à direita), lido do DOM,
 * como padding para flyTo/fitBounds: o alvo fica no centro da parte VISÍVEL do mapa.
 * Há dois painéis (o cartão do tablet/computador e a folha do celular); vale o que está visível.
 * Usa a altura final do cartão (data-altura-final), porque ele pode estar no meio da animação.
 */
export function paddingDoPainel(container: HTMLElement): Padding {
  const zero = { top: 0, right: 0, bottom: 0, left: 0 };
  const painel = [...document.querySelectorAll<HTMLElement>('[data-painel-mapa]')].find((el) => el.getClientRects().length > 0);
  if (!painel) return zero;
  const m = container.getBoundingClientRect();
  const p = painel.getBoundingClientRect();
  if (p.width < m.width * 0.6) return { ...zero, right: Math.max(0, m.right - p.left) };
  const altura = Number(painel.dataset.alturaFinal) || p.height;
  return { ...zero, bottom: Math.max(0, m.bottom - (p.bottom - altura)) };
}

/**
 * Deslocamento para o flyTo pôr o alvo no centro da parte visível do mapa. Usar no lugar do
 * `padding` do flyTo: no MapLibre o padding de uma animação fica gravado no mapa e se soma ao do
 * enquadramento seguinte (fitBounds da "minha região"), que então sai torto ou nem se move.
 */
export function deslocamentoDoPainel(p: Padding): [number, number] {
  return [-p.right / 2, -p.bottom / 2];
}
