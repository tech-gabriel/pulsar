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

interface CondicaoBola {
  zoom: number;
  camadaAtiva: 'score' | 'temperatura' | 'chuva' | 'vento';
  /** Há trechos no mapa: de perto, na camada de risco, a bola sai e fica só o nome. */
  comTrechos?: boolean;
  /** Camada de alagamentos ligada: os números somem. */
  atenuado?: boolean;
  /** Área sem número (saída e chegada da rota). */
  oculta?: boolean;
}

/**
 * Diâmetro da bola de nota de uma área neste zoom, ou null quando ela não está no mapa. Fonte
 * única para o ScoreLabel (que desenha a bola) e o desvio dela diante de Casa e Trabalho.
 * Mesmo tamanho em todas as camadas e faixas (escolha T1 de 17/11/2026: o risco igual à temperatura).
 */
export function diametroDaBola({ zoom, camadaAtiva, comTrechos = false, atenuado = false, oculta = false }: CondicaoBola): number | null {
  const tamanho = tamanhoParaZoom(zoom);
  if (!tamanho || atenuado || oculta) return null;
  if (comTrechos && camadaAtiva === 'score' && zoom >= ZOOM_TRECHOS.de) return null;
  return Math.round(tamanho.diametro * 0.8);
}

interface Ponto { x: number; y: number }
interface Circulo extends Ponto { r: number }

/** Meio ponto de Casa e Trabalho (24 px) mais uma folga: a bola não encosta nele. */
const LONGE_DO_PONTO = 12 + 4;

/**
 * Quanto a bola de nota se afasta para não ficar embaixo do ponto de Casa ou Trabalho (opção D,
 * 17/11/2026: o ponto é o lugar exato da pessoa e não se move; a bola marca só o centro aproximado
 * da área, então é ela que cede). Procura o lugar livre mais perto, sem encostar nos pontos nem nas
 * outras bolas. Em pixels de tela, a partir do centro da bola.
 */
export function desvioDaBola(bola: Circulo, pontos: Ponto[], outras: Circulo[]): Ponto {
  const bate = (x: number, y: number) => pontos.some((p) => Math.hypot(p.x - x, p.y - y) < bola.r + LONGE_DO_PONTO);
  if (!bate(bola.x, bola.y)) return { x: 0, y: 0 };
  const livre = (x: number, y: number) => !bate(x, y) && outras.every((o) => Math.hypot(o.x - x, o.y - y) >= o.r + bola.r + 2);
  const maisPerto = pontos.reduce((m, p) => (Math.hypot(p.x - bola.x, p.y - bola.y) < Math.hypot(m.x - bola.x, m.y - bola.y) ? p : m));
  // Primeiro na direção oposta ao ponto, depois abrindo o ângulo para os dois lados.
  const base = Math.atan2(bola.y - maisPerto.y, bola.x - maisPerto.x);
  for (let raio = 2; raio <= 60; raio += 2) {
    for (let a = 0; a <= 180; a += 15) {
      for (const lado of a === 0 || a === 180 ? [1] : [1, -1]) {
        const ang = base + (lado * a * Math.PI) / 180;
        const x = bola.x + Math.cos(ang) * raio;
        const y = bola.y + Math.sin(ang) * raio;
        if (livre(x, y)) return { x: x - bola.x, y: y - bola.y };
      }
    }
  }
  return { x: 0, y: 0 }; // sem lugar livre por perto: fica onde está
}
