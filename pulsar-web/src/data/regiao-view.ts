// pulsar-web/src/data/regiao-view.ts
import {
  getZonaPorSlug, getSubprefeituraPorSlug, type ZonaSeo, type SubprefeituraSeo,
} from './regioes-seo';
import type { FaixaRisco } from '../types';
import snapshot from './regioes-snapshot.json';
import ocorrenciasSnapshot from './ocorrencias-snapshot.json';

/** Estatísticas do rollup de uma página (GET /api/estatisticas/regioes, via snapshot). */
export interface EstatisticasRegiao {
  diasCompletos: number;
  diasAlerta: number;
  chuvaTotalMm: number;
  faixaPredominante: FaixaRisco;
  diaMaisChuvoso: { dia: string; mm: number } | null;
}
/** Estatísticas + o contexto da janela, prontas para o BlocoEstatisticas. */
export interface PainelEstatisticas extends EstatisticasRegiao {
  janelaDias: number;
  atualizadoEm: string; // "2026-10-13"
}
export interface RegiaoView extends ZonaSeo {
  estatisticas: PainelEstatisticas | null;
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
  estatisticas: PainelEstatisticas | null;
}

const dados = snapshot as unknown as {
  geradoEm: string;
  janelaDias: number;
  subprefeituras: Record<string, EstatisticasRegiao | null>;
  zonas: Record<string, EstatisticasRegiao | null>;
};

const ocorrencias = ocorrenciasSnapshot as {
  geradoEm: string;
  periodo: { de: string | null; ate: string | null };
  subprefeituras: Record<string, OcorrenciasSub>;
};

function painel(e: EstatisticasRegiao | null | undefined): PainelEstatisticas | null {
  return e ? { ...e, janelaDias: dados.janelaDias, atualizadoEm: dados.geradoEm } : null;
}

export function getRegiaoView(slug: string): RegiaoView | undefined {
  const zona = getZonaPorSlug(slug);
  if (!zona) return undefined;
  return { ...zona, estatisticas: painel(dados.zonas[slug]) };
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
    estatisticas: painel(dados.subprefeituras[slug]),
  };
}
