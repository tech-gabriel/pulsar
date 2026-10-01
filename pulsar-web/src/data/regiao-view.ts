// pulsar-web/src/data/regiao-view.ts
import {
  getZonaPorSlug, getSubprefeituraPorSlug, type ZonaSeo, type SubprefeituraSeo,
} from './regioes-seo';
import snapshot from './regioes-snapshot.json';
import ocorrenciasSnapshot from './ocorrencias-snapshot.json';

export interface SnapshotZona {
  diasRiscoAlto: number;
  chuvaAcumuladaMm: number;
  faixaPredominante: 'BAIXO' | 'MODERADO' | 'ALTO';
}
export interface RegiaoView extends ZonaSeo {
  snapshot: SnapshotZona | null;
  janelaDias: number;
}

export interface OcorrenciasSub {
  total: number;
  mesPico: string | null;  // "2026-03"
  ultima: string | null;   // "2026-05-11"
}
export interface SubprefeituraView extends SubprefeituraSeo {
  zona: ZonaSeo;
  ocorrencias: OcorrenciasSub | null;
  periodo: { de: string | null; ate: string | null };
  geradoEm: string;
}

const dados = snapshot as {
  geradoEm: string;
  janelaDias: number;
  zonas: Record<string, SnapshotZona>;
};

const ocorrencias = ocorrenciasSnapshot as {
  geradoEm: string;
  periodo: { de: string | null; ate: string | null };
  subprefeituras: Record<string, OcorrenciasSub>;
};

export function getRegiaoView(slug: string): RegiaoView | undefined {
  const zona = getZonaPorSlug(slug);
  if (!zona) return undefined;
  return { ...zona, snapshot: dados.zonas[slug] ?? null, janelaDias: dados.janelaDias };
}

export function getSubprefeituraView(slug: string): SubprefeituraView | undefined {
  const sub = getSubprefeituraPorSlug(slug);
  if (!sub) return undefined;
  return {
    ...sub,
    zona: getZonaPorSlug(sub.zonaSlug)!,
    ocorrencias: ocorrencias.subprefeituras[slug] ?? null,
    periodo: ocorrencias.periodo,
    geradoEm: ocorrencias.geradoEm,
  };
}
