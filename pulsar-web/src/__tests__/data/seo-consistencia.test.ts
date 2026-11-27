// Guarda contra divergência: o sitemap lê as URLs de SEO dos snapshots JSON, fora
// do TS. Sem entrada no sitemap, o Google demora a achar a página. (O Caddy serve
// qualquer <rota>/index.html pelo try_files, então não há lista de rewrites a conferir.)
/// <reference types="node" />
// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { regiaoPaths } from '../../data/regioes-seo';
import ocorrencias from '../../data/ocorrencias-snapshot.json';
import regioesSnapshot from '../../data/regioes-snapshot.json';

const raizWeb = process.cwd().endsWith('pulsar-web') ? process.cwd() : resolve(process.cwd(), 'pulsar-web');
const ler = (arq: string) => readFileSync(resolve(raizWeb, arq), 'utf8');

describe('consistência das URLs de SEO', () => {
  it('os snapshots têm exatamente os slugs de regiaoPaths() (fonte do sitemap)', () => {
    const doSnapshot = [...Object.keys(regioesSnapshot.zonas), ...Object.keys(ocorrencias.subprefeituras)]
      .map((s) => `/risco-de-alagamento/${s}`);
    expect(doSnapshot.sort()).toEqual(regiaoPaths().sort());
  });

  it('a página da Baixada Santista é prerenderizada e está no sitemap', () => {
    expect(ler('react-ssg.config.ts')).toContain("'/baixada-santista'");
    expect(ler('scripts/gerar-sitemap.mjs')).toContain("loc: '/baixada-santista'");
    expect(ler('public/sitemap.xml')).toContain('<loc>https://app-pulsar.com.br/baixada-santista</loc>');
  });
});
