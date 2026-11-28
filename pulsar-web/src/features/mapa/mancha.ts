import type { Feature, FeatureCollection, Point } from 'geojson';
import type { SubprefeituraMapaDto } from '../../types';
import type { Trecho } from '../cidade/trechos';
import { nivelDaArea, type CamadaMapa } from './nivel';

export type PropsMancha = { banda: number; mm?: number };

/** Um ponto no centro de cada trecho, com a banda (ou os mm) da camada: o MapLibre espalha isso em mancha. */
export function pontosDaMancha(
  camada: CamadaMapa,
  centros: Record<string, [number, number]>,
  trechos: Map<string, Trecho> | null,
  areas: SubprefeituraMapaDto[],
  celulas: { h3: string; areaId: string }[],
): FeatureCollection<Point, PropsMancha> {
  const features: Feature<Point, PropsMancha>[] = [];
  const add = (h3: string, props: PropsMancha) => {
    const c = centros[h3];
    if (c) features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: c }, properties: props });
  };
  if (camada === 'score') {
    for (const t of trechos?.values() ?? []) {
      if (t.faixa !== 'BAIXO') add(t.h3, { banda: t.faixa === 'ALTO' ? 2 : 1 });
    }
    return { type: 'FeatureCollection', features };
  }
  const porId = new Map(areas.map((a) => [a.id, a]));
  for (const { h3, areaId } of celulas) {
    const a = porId.get(areaId);
    if (!a) continue;
    if (camada === 'chuva') {
      const mm = trechos?.get(h3)?.estacao?.mm1h ?? a.ultimaLeitura?.chuvaMmH ?? 0;
      if (mm > 0) add(h3, { banda: 0, mm });
      continue;
    }
    const n = nivelDaArea(a, camada);
    if (n.nivel !== 'semDado') add(h3, { banda: n.banda });
  }
  return { type: 'FeatureCollection', features };
}
