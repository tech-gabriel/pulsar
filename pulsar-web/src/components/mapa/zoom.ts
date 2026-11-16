// Zoom na escala do MapLibre (mundo de 512 px no zoom 0). O Leaflet usava 256 px, então os
// números de hoje são os do Leaflet menos 1: o enquadramento fica igual ao de antes da troca.
export const ZOOM = { sp: 9, regiao: 10, sub: 12, busca: 15 } as const;

/**
 * A cidade inteira na tela: em celular estreito (320 px) o zoom 9 deixava a zona leste embaixo da
 * coluna de botões à direita (crítica de 15/11). 8,5 ainda arredonda para 9 nos números.
 */
export function zoomCidade(largura: number): number {
  return largura < 360 ? 8.5 : ZOOM.sp;
}

/**
 * Intervalo em que as áreas dão lugar aos trechos (opção B, escolhida no protótipo de 13/11):
 * abaixo de `de` só áreas, acima de `ate` só trechos, no meio as duas se cruzam. Os dados
 * começam a vir um pouco antes (`carregar`), para os trechos já estarem lá quando surgirem.
 */
export const ZOOM_TRECHOS = { carregar: 10, de: 10.6, ate: 11.4 } as const;

export interface TamanhoLabel {
  diametro: number;
  fonte: number;
  nomeFonte: number; // 0 = nome oculto neste zoom
}

// ≤ 8 esconde tudo; 9 só o círculo; 10 nome 9px; 11 nome 10px; ≥ 12 nome 11px.
// A fonte do número nunca desce de 11px (mínimo legível no celular).
// O MapLibre tem zoom contínuo: arredonda para o label não alternar entre dois tamanhos.
export function tamanhoParaZoom(zoom: number): TamanhoLabel | null {
  const z = Math.round(zoom);
  if (z <= 8) return null;
  if (z === 9) return { diametro: 32, fonte: 11, nomeFonte: 0 };
  if (z === 10) return { diametro: 32, fonte: 11, nomeFonte: 9 };
  if (z === 11) return { diametro: 35, fonte: 12, nomeFonte: 10 };
  return { diametro: 38, fonte: 13, nomeFonte: 11 };
}
