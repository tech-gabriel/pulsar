import type { LayerSpecification, StyleSpecification } from 'maplibre-gl';

// Mapa base: estilo Liberty do OpenFreeMap (grátis, sem chave) recolorido no tom do Google Maps.
// O mapa base não é leitura de risco, por isso os tons dele moram aqui e não em utils/paleta.ts.
// Só tipos do maplibre-gl neste arquivo: o runtime fica no chunk do mapa.

export interface Tom {
  chao: string;
  agua: string;
  verde: string;
  predio: string;
  rua: string;
  ruaBorda: string;
  via: string;
  viaBorda: string;
  textoRua: string;
  haloRua: string;
}

export const TOM_CLARO: Tom = {
  chao: '#f6f6f4',
  agua: '#9fd3f5',
  verde: '#c9e9c0',
  predio: '#ecebe8',
  rua: '#ffffff',
  ruaBorda: '#dcdcdc',
  via: '#fde58a',
  viaBorda: '#ecc75a',
  textoRua: '#5f6368',
  haloRua: '#ffffff',
};

// Ponto de partida no tom do Google Maps escuro; conferido no olho com o user.
export const TOM_ESCURO: Tom = {
  chao: '#1f2329',
  agua: '#17263c',
  verde: '#1e3a2b',
  predio: '#2a2f36',
  rua: '#3a4049',
  ruaBorda: '#2a2f36',
  via: '#7a6420',
  viaBorda: '#5a4a18',
  textoRua: '#c4c9d1',
  haloRua: '#1f2329',
};

export const URL_OPENFREEMAP = 'https://tiles.openfreemap.org/styles/liberty';

/** Quantos níveis de zoom antes do padrão os comércios aparecem (pedido do user: mais comércios). */
const ANTECIPA_POI = 2;

type Pintura = Record<string, unknown>;

function cor(camada: LayerSpecification, tom: Tom): Pintura | null {
  const id = camada.id.toLowerCase();
  switch (camada.type) {
    case 'background':
      return { 'background-color': tom.chao };
    case 'fill':
      if (/water/.test(id)) return { 'fill-color': tom.agua };
      if (/park|wood|grass|forest|green|cemetery|pitch|golf|landcover/.test(id)) return { 'fill-color': tom.verde };
      if (/building/.test(id)) return { 'fill-color': tom.predio };
      if (/landuse|residential|industrial|commercial|retail/.test(id)) return { 'fill-color': tom.chao };
      return null;
    case 'line':
      if (/water|river|stream/.test(id)) return { 'line-color': tom.agua };
      if (/casing|outline/.test(id)) return { 'line-color': /motorway|trunk/.test(id) ? tom.viaBorda : tom.ruaBorda };
      if (/motorway|trunk/.test(id)) return { 'line-color': tom.via };
      if (/road|street|primary|secondary|tertiary|minor|service|link|bridge|tunnel/.test(id)) return { 'line-color': tom.rua };
      return null;
    case 'symbol':
      if (/road|street|highway/.test(id) && !/shield/.test(id)) return { 'text-color': tom.textoRua, 'text-halo-color': tom.haloRua };
      return null;
    default:
      return null;
  }
}

/** Recolore o Liberty no tom pedido, desliga os prédios 3D e antecipa os comércios. Não muta a entrada. */
export function recolorirEstilo(estilo: StyleSpecification, tom: Tom): StyleSpecification {
  const layers = estilo.layers.map((original) => {
    const camada = { ...original } as LayerSpecification & { paint?: Pintura; layout?: Pintura; minzoom?: number };
    const pintura = cor(original, tom);
    if (pintura) camada.paint = { ...(original as { paint?: Pintura }).paint, ...pintura };
    if (original.type === 'fill-extrusion') camada.layout = { ...(original as { layout?: Pintura }).layout, visibility: 'none' };
    if (original.type === 'symbol' && /poi/.test(original.id.toLowerCase())) {
      camada.minzoom = Math.max(0, (original.minzoom ?? 14) - ANTECIPA_POI);
    }
    return camada as LayerSpecification;
  });
  return { ...estilo, layers };
}

/** Baixa o Liberty e devolve recolorido no tom do tema. Lança se o OpenFreeMap não responder bem. */
export async function carregarEstiloBase(tema: 'light' | 'dark', signal?: AbortSignal): Promise<StyleSpecification> {
  const resposta = await fetch(URL_OPENFREEMAP, { signal });
  if (!resposta.ok) throw new Error(`OpenFreeMap respondeu ${resposta.status}`);
  const estilo = (await resposta.json()) as StyleSpecification;
  return recolorirEstilo(estilo, tema === 'dark' ? TOM_ESCURO : TOM_CLARO);
}

/** Estilo vetorial do MapTiler, usado só se o OpenFreeMap não abrir. */
export function urlReservaMapTiler(tema: 'light' | 'dark', chave: string): string {
  const estilo = tema === 'dark' ? 'streets-v2-dark' : 'streets-v2';
  return `https://api.maptiler.com/maps/${estilo}/style.json?key=${chave}`;
}

/** O estilo do MapTiler pede sprite e afins sem a chave; sem ela os ícones (e os nomes junto) somem. */
export function comChaveMapTiler(url: string, chave: string): string {
  if (!url.startsWith('https://api.maptiler.com/') || /[?&]key=/.test(url)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}key=${chave}`;
}
