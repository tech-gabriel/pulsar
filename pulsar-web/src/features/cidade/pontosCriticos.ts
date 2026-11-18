import type { FeatureCollection, Point } from 'geojson';

/** Ponto de public/pontos-criticos-baixada.json: lista curada, com fonte e data de cada um. */
export interface PontoCritico {
  nome: string;
  municipio: string;
  lat: number;
  lon: number;
  fonte: string;
  /** Dia em que alagou (AAAA-MM-DD). */
  data: string;
}

const dataPorExtenso = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** O texto do toque: quando alagou, que não pesa no número da área, e o site da fonte. */
export function textoPontoCritico(p: PontoCritico): { quando: string; fonte: string } {
  const dia = dataPorExtenso.format(new Date(`${p.data}T00:00:00Z`));
  return {
    quando: `Alagou em ${dia}. Não muda o risco da área.`,
    fonte: new URL(p.fonte).hostname.replace(/^www\./, ''),
  };
}

/** Os pontos para a fonte do mapa (GeoJSON é lon, lat); o índice acha o ponto no toque. */
export function pontosCriticosGeojson(pontos: PontoCritico[]): FeatureCollection<Point, { i: number }> {
  return {
    type: 'FeatureCollection',
    features: pontos.map((p, i) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] }, properties: { i } })),
  };
}
