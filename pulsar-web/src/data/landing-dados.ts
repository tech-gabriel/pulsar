// Dados da landing derivados dos snapshots do build. Só GeoSampa (alagamentos
// registrados pela Prefeitura): o rollup de chuva tem leituras ruins em set/2026
// em seis subprefeituras e não aparece aqui até ser corrigido.
import ocorrenciasSnapshot from './ocorrencias-snapshot.json';
import { subprefeituras } from './regioes-seo';

const OCORR = ocorrenciasSnapshot as { periodo: { de: string; ate: string }; subprefeituras: Record<string, { total: number }> };

export const ANO = OCORR.periodo.ate.slice(0, 4);
export const TOTAL_ALAGAMENTOS = Object.values(OCORR.subprefeituras).reduce((a, b) => a + b.total, 0);
export const MAX_ALAGAMENTOS = Math.max(...Object.values(OCORR.subprefeituras).map((s) => s.total));

export const totalDe = (slug: string) => OCORR.subprefeituras[slug]?.total ?? 0;

const RANKING = subprefeituras.map((s) => s.slug).sort((a, b) => totalDe(b) - totalDe(a));
/** 1 = a subprefeitura com mais alagamentos registrados. Empate fica com a melhor posição. */
export const posicaoDe = (slug: string) => RANKING.findIndex((s) => totalDe(s) === totalDe(slug)) + 1;

export function mesPorExtenso(aaaamm: string | null | undefined) {
  if (!aaaamm) return null;
  const [a, m] = aaaamm.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, 15)).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' });
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export interface ResultadoBusca { rotulo: string; slug: string; detalhe: string }

const INDICE = subprefeituras.flatMap((s) => [
  { rotulo: s.nome, slug: s.slug, chave: semAcento(s.nome), detalhe: 'Subprefeitura' },
  ...s.distritos.filter((d) => d !== s.nome).map((d) => ({ rotulo: d, slug: s.slug, chave: semAcento(d), detalhe: `Bairro da subprefeitura ${s.nome}` })),
]);

/** Busca local nos 96 distritos e 32 subprefeituras, sem acento. Começo de palavra vem antes. */
export function buscarRegiao(q: string, limite = 6): ResultadoBusca[] {
  const k = semAcento(q.trim());
  if (k.length < 2) return [];
  const comeca = INDICE.filter((i) => i.chave.startsWith(k) || i.chave.includes(` ${k}`));
  const contem = INDICE.filter((i) => !comeca.includes(i) && i.chave.includes(k));
  return [...comeca, ...contem].slice(0, limite).map(({ rotulo, slug, detalhe }) => ({ rotulo, slug, detalhe }));
}
