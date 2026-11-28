import type { LayerSpecification, Map as MapaMapLibre, StyleSpecification } from 'maplibre-gl';

// Mapa base: estilo Liberty do OpenFreeMap (grátis, sem chave) recolorido no tom do Google Maps.
// O mapa base não é leitura de risco, por isso os tons dele moram aqui e não em utils/paleta.ts.
// Só tipos do maplibre-gl neste arquivo: o runtime fica no chunk do mapa.

export interface Tom {
  chao: string;
  agua: string;
  verde: string;
  predio: string;
  predioBorda: string;
  rua: string;
  ruaBorda: string;
  via: string;
  viaBorda: string;
  textoRua: string;
  haloRua: string;
  /** No escuro, todo rótulo (lugares, comércios) usa o texto e o halo das ruas; no claro, o Liberty já serve. */
  recoloreRotulos: boolean;
}

export const TOM_CLARO: Tom = {
  chao: '#f6f6f4',
  agua: '#9fd3f5',
  verde: '#c9e9c0',
  predio: '#e2dfd9',
  predioBorda: '#cfcac2',
  rua: '#ffffff',
  ruaBorda: '#dcdcdc',
  via: '#fde58a',
  viaBorda: '#ecc75a',
  textoRua: '#5f6368',
  haloRua: '#ffffff',
  recoloreRotulos: false,
};

// Ponto de partida no tom do Google Maps escuro; conferido no olho com o user.
export const TOM_ESCURO: Tom = {
  chao: '#1f2329',
  agua: '#17263c',
  verde: '#1e3a2b',
  predio: '#2c3138',
  predioBorda: '#3b414a',
  rua: '#3a4049',
  ruaBorda: '#2a2f36',
  via: '#7a6420',
  viaBorda: '#5a4a18',
  textoRua: '#c4c9d1',
  haloRua: '#1f2329',
  recoloreRotulos: true,
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
      if (/building/.test(id)) return { 'fill-color': tom.predio, 'fill-outline-color': tom.predioBorda };
      if (/landuse|residential|industrial|commercial|retail/.test(id)) return { 'fill-color': tom.chao };
      return null;
    case 'line':
      if (/water|river|stream/.test(id)) return { 'line-color': tom.agua };
      if (/casing|outline/.test(id)) return { 'line-color': /motorway|trunk/.test(id) ? tom.viaBorda : tom.ruaBorda };
      if (/motorway|trunk/.test(id)) return { 'line-color': tom.via };
      if (/road|street|primary|secondary|tertiary|minor|service|link|bridge|tunnel/.test(id)) return { 'line-color': tom.rua };
      return null;
    case 'symbol':
      if (/shield/.test(id)) return null;
      if (tom.recoloreRotulos || /road|street|highway/.test(id)) return { 'text-color': tom.textoRua, 'text-halo-color': tom.haloRua };
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
    // Prédios planos em todo zoom de rua (o Liberty só os desenha até o 14 e daí passa ao 3D, desligado).
    if (original.type === 'fill' && /building/.test(original.id.toLowerCase())) delete camada.maxzoom;
    if (original.type === 'fill-extrusion') camada.layout = { ...(original as { layout?: Pintura }).layout, visibility: 'none' };
    if (original.type === 'symbol' && /poi/.test(original.id.toLowerCase())) {
      camada.minzoom = Math.max(0, (original.minzoom ?? 14) - ANTECIPA_POI);
    }
    return camada as LayerSpecification;
  });
  // O crédito em português: o TileJSON do OpenFreeMap traz "Data from". A licença pede os nomes
  // e os links, não o idioma.
  const sources = { ...estilo.sources };
  if (sources.openmaptiles) sources.openmaptiles = { ...sources.openmaptiles, attribution: CREDITO } as typeof sources.openmaptiles;
  return { ...estilo, layers, sources };
}

export const CREDITO = '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank">© OpenMapTiles</a> Dados do <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>';

/** Baixa o Liberty e devolve recolorido no tom do tema. Lança se o OpenFreeMap não responder bem. */
export async function carregarEstiloBase(tema: 'light' | 'dark', signal?: AbortSignal): Promise<StyleSpecification> {
  const resposta = await fetch(URL_OPENFREEMAP, { signal });
  if (!resposta.ok) throw new Error(`OpenFreeMap respondeu ${resposta.status}`);
  const estilo = (await resposta.json()) as StyleSpecification;
  return recolorirEstilo(estilo, tema === 'dark' ? TOM_ESCURO : TOM_CLARO);
}

const emAndamento = new Map<'light' | 'dark', Promise<StyleSpecification>>();

/**
 * Mesmo que carregarEstiloBase, mas uma busca por tema: a página do mapa já começa a baixar o
 * estilo enquanto o chunk do MapLibre chega, e o mapa reaproveita. Falha não fica guardada.
 */
export function estiloBaseCompartilhado(tema: 'light' | 'dark'): Promise<StyleSpecification> {
  let promessa = emAndamento.get(tema);
  if (!promessa) {
    promessa = carregarEstiloBase(tema);
    promessa.catch(() => emAndamento.delete(tema));
    emAndamento.set(tema, promessa);
  }
  return promessa;
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

const baseLayers = (mapa: MapaMapLibre) => mapa.getStyle().layers.filter((l) => !l.id.startsWith('pulsar-'));

/**
 * Sobe a água do mapa base para antes de `antesDe` (por padrão o primeiro símbolo), ou seja, por cima
 * da mancha: ela nunca borra o mar nem as represas. Idempotente (roda a cada troca de estilo base).
 */
export function aguaPorCima(mapa: MapaMapLibre, antesDe?: string): void {
  const alvo = antesDe ?? baseLayers(mapa).find((l) => l.type === 'symbol')?.id;
  for (const l of baseLayers(mapa)) {
    if (l.type === 'fill' && /water|ocean|sea/.test(l.id)) mapa.moveLayer(l.id, alvo);
  }
}

/** Vias expressas em cinza (o amarelo delas brigava com a mancha de Atenção); `ligado=false` devolve o tom. */
export function viasCinza(mapa: MapaMapLibre, tema: 'light' | 'dark', ligado: boolean): void {
  const escuro = tema === 'dark';
  const tom = escuro ? TOM_ESCURO : TOM_CLARO;
  for (const l of baseLayers(mapa)) {
    if (l.type !== 'line' || !/motorway|trunk/.test(l.id)) continue;
    const borda = /casing|outline/.test(l.id);
    const cinza = escuro ? (borda ? '#2a2f36' : '#4b525c') : borda ? '#c7ccd3' : '#e6e8eb';
    mapa.setPaintProperty(l.id, 'line-color', ligado ? cinza : borda ? tom.viaBorda : tom.via);
  }
}
