// ── Paleta das leituras do mapa ───────────────────────────────────────────────
// Fonte única dos tons usados para *ler* o mapa: polígonos e círculos das
// camadas (utils/camadas.ts), faixas de risco (utils/risco.ts), gradientes da
// legenda (MapLegend) e marcadores do overlay de alagamentos
// (ocorrenciaMarker.ts).
//
// Todos são tons da escala Tailwind, para casarem com as classes usadas no
// resto da UI. Antes de introduzir um tom novo, veja se algum destes serve: o
// overlay de alagamentos nasceu com um azul próprio (#1e40af, blue-800) e ficou
// visivelmente fora do padrão das outras leituras do mapa.
export const PALETA = {
  neutro: '#94a3b8', // slate-400  — sem dado, valor irrelevante
  azul: '#3b82f6', // blue-500   — frio, chuva fraca/média, alagamento
  azulProfundo: '#1d4ed8', // blue-700   — chuva forte, inundação, cluster
  verde: '#22c55e', // green-500  — risco baixo
  amarelo: '#eab308', // yellow-500 — risco moderado
  ambar: '#f59e0b', // amber-500  — atenção
  vermelho: '#ef4444', // red-500    — risco alto
  roxo: '#9333ea', // purple-600 — UV extremo
} as const;

export type TomPaleta = keyof typeof PALETA;

/**
 * Mesmo tom da paleta, com alfa. Os preenchimentos e os círculos de label
 * precisam do tom translúcido; derivando do hex em vez de escrever o `rgba()`
 * à mão, os dois não têm como divergir quando um tom for ajustado.
 */
export function comAlfa(hex: string, alfa: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alfa})`;
}
