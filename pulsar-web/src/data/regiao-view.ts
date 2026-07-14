// pulsar-web/src/data/regiao-view.ts
import { getZonaPorSlug, type ZonaSeo } from './regioes-seo';
import snapshot from './regioes-snapshot.json';

export interface SnapshotZona {
  diasRiscoAlto: number;
  chuvaAcumuladaMm: number;
  faixaPredominante: 'BAIXO' | 'MODERADO' | 'ALTO';
}
export interface RegiaoView extends ZonaSeo {
  snapshot: SnapshotZona | null;
  janelaDias: number;
}

const dados = snapshot as {
  geradoEm: string;
  janelaDias: number;
  zonas: Record<string, SnapshotZona>;
};

export function getRegiaoView(slug: string): RegiaoView | undefined {
  const zona = getZonaPorSlug(slug);
  if (!zona) return undefined;
  return { ...zona, snapshot: dados.zonas[slug] ?? null, janelaDias: dados.janelaDias };
}
