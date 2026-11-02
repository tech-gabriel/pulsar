import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { SubprefeituraMapaDto } from '../../types';
import { estiloCamada, type Camada } from '../../utils/camadas';
import { normalizarNome } from '../../utils/texto';

export type EstadoRegiao = 'normal' | 'fora' | 'foco' | 'selecionada';

export interface PropsRegiao {
  subId: string | null;
  nome: string;
  fill: string;
  fillOpacity: number;
  borda: string;
  bordaOpacidade: number;
  peso: number;
  estado: EstadoRegiao;
}

const NEUTRO = '#94a3b8';
const BRANCO = '#ffffff';

/**
 * Os polígonos das subprefeituras com o estilo já resolvido em cada feature (camada, seleção e
 * região em foco), para o MapLibre pintar direto das propriedades. Os ids numéricos por índice
 * servem ao feature-state do hover.
 */
export function montarRegioes(
  geojson: FeatureCollection,
  subs: SubprefeituraMapaDto[],
  camada: Camada,
  selecionadaId: string | null,
  zonaEmFoco: string | null,
): FeatureCollection<Geometry, PropsRegiao> {
  const porNome = new Map(subs.map((s) => [normalizarNome(s.nome), s]));
  const zona = zonaEmFoco ? normalizarNome(zonaEmFoco) : null;

  const features = geojson.features.map((f, i): Feature<Geometry, PropsRegiao> => {
    const nome = String((f.properties as Record<string, unknown> | null)?.nm_subprefeitura ?? '');
    const sub = porNome.get(normalizarNome(nome));
    return { type: 'Feature', id: i, geometry: f.geometry, properties: propsDe(sub, nome, camada, selecionadaId, zona) };
  });
  return { type: 'FeatureCollection', features };
}

function propsDe(
  sub: SubprefeituraMapaDto | undefined,
  nome: string,
  camada: Camada,
  selecionadaId: string | null,
  zona: string | null,
): PropsRegiao {
  if (!sub) {
    return { subId: null, nome, fill: NEUTRO, fillOpacity: 0.12, borda: NEUTRO, bordaOpacidade: 0.3, peso: 1, estado: 'normal' };
  }
  const e = estiloCamada(sub, camada);
  const base = { subId: sub.id, nome, fill: e.fillColor, fillOpacity: e.fillOpacity, borda: e.borderColor, bordaOpacidade: 0.6, peso: e.weight };
  const naZona = zona == null || normalizarNome(sub.zona) === zona;

  if (zona != null && !naZona) return { ...base, fillOpacity: 0.05, bordaOpacidade: 0.15, peso: 1, estado: 'fora' };
  if (sub.id === selecionadaId) {
    return { ...base, fillOpacity: e.fillOpacity + 0.1, borda: BRANCO, bordaOpacidade: 1, peso: 2, estado: 'selecionada' };
  }
  if (zona != null) return { ...base, fillOpacity: e.fillOpacity + 0.05, borda: BRANCO, bordaOpacidade: 0.9, peso: 2, estado: 'foco' };
  return { ...base, estado: 'normal' };
}
