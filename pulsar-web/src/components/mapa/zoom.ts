// Zoom na escala do MapLibre (mundo de 512 px no zoom 0). O Leaflet usava 256 px, então os
// números de hoje são os do Leaflet menos 1: o enquadramento fica igual ao de antes da troca.
export const ZOOM = { sp: 9, regiao: 10, sub: 12, busca: 15 } as const;

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
