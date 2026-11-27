// Os 9 municípios da Baixada Santista para as páginas públicas. `nome` casa com o seed do
// backend (Municipio) e com `nm_subprefeitura` de public/baixada-santista-leve.geojson.
// Os números vêm só de baixada-snapshot.json (gerado por scripts/gerar-snapshot-baixada.mjs).
import snapshot from './baixada-snapshot.json';
import { slugify } from './regioes-seo';
import { normalizarNome } from '../utils/texto';

export const CIDADE_BAIXADA = { slug: 'baixada-santista', nome: 'Baixada Santista', path: '/baixada-santista' };

export interface MunicipioSeo {
  slug: string;
  nome: string;
  emNome: string;   // "em Santos", "no Guarujá"
  deNome: string;   // "de Santos", "do Guarujá"
  codigoIbge: string;
}

const BASE: [nome: string, ibge: string][] = [
  ['Santos', '3548500'],
  ['São Vicente', '3551009'],
  ['Guarujá', '3518701'],
  ['Cubatão', '3513504'],
  ['Praia Grande', '3541000'],
  ['Bertioga', '3506359'],
  ['Mongaguá', '3531100'],
  ['Itanhaém', '3522109'],
  ['Peruíbe', '3537602'],
];

export const municipios: MunicipioSeo[] = BASE.map(([nome, codigoIbge]) => {
  const no = nome === 'Guarujá';
  return { slug: slugify(nome), nome, emNome: `${no ? 'no' : 'em'} ${nome}`, deNome: `${no ? 'do' : 'de'} ${nome}`, codigoIbge };
});

export function getMunicipioPorSlug(slug: string): MunicipioSeo | undefined {
  return municipios.find((m) => m.slug === slug);
}

/** Casa por início de palavra, sem acento ("sao v", "praia"). */
export function buscarMunicipio(q: string, limite = 6): MunicipioSeo[] {
  const termo = normalizarNome(q);
  if (termo.length < 2) return [];
  return municipios
    .filter((m) => normalizarNome(m.nome).split(' ').some((_, i, ps) => ps.slice(i).join(' ').startsWith(termo)))
    .slice(0, limite);
}

export function numerosDe(slug: string): { trechos: number; trechosRisco: number; pontos: number } | undefined {
  const m = (snapshot.municipios as Record<string, { trechos: number; trechosRisco: number; pontos: unknown[] }>)[slug];
  return m && { trechos: m.trechos, trechosRisco: m.trechosRisco, pontos: m.pontos.length };
}

export const ATALHOS_BAIXADA = ['santos', 'sao-vicente', 'guaruja', 'praia-grande', 'cubatao'];

export interface PontoBaixada { nome: string; data: string; fonte: string }

/** Pontos onde já alagou no município, do mais recente ao mais antigo (ordem do snapshot). */
export function pontosDe(slug: string): PontoBaixada[] {
  return (snapshot.municipios as Record<string, { pontos: PontoBaixada[] }>)[slug]?.pontos ?? [];
}

export const BAIXADA_GERADO_EM = snapshot.geradoEm;
