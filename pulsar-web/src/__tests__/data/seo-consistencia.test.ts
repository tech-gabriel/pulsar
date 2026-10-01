// Guarda contra divergência: sitemap e render.yaml têm as URLs de SEO escritas
// fora do TS (o sitemap lê os snapshots JSON; o render.yaml é estático). Se
// uma página entrar em regiaoPaths() sem rewrite, o Render serve o spa.html
// errado; sem entrada no sitemap, o Google demora a achar a página.
/// <reference types="node" />
// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { regiaoPaths } from '../../data/regioes-seo';
import ocorrencias from '../../data/ocorrencias-snapshot.json';
import regioesSnapshot from '../../data/regioes-snapshot.json';

// render.yaml fica na raiz do monorepo, fora da raiz do Vite (import ?raw é negado).
const yaml = readFileSync(new URL('../../../../render.yaml', import.meta.url), 'utf8');

describe('consistência das URLs de SEO', () => {
  it('os snapshots têm exatamente os slugs de regiaoPaths() (fonte do sitemap)', () => {
    const doSnapshot = [...Object.keys(regioesSnapshot.zonas), ...Object.keys(ocorrencias.subprefeituras)]
      .map((s) => `/risco-de-alagamento/${s}`);
    expect(doSnapshot.sort()).toEqual(regiaoPaths().sort());
  });

  it('render.yaml tem um rewrite para cada página de região', () => {
    for (const p of regiaoPaths()) {
      expect(yaml).toMatch(new RegExp(`source: ${p}\\r?\\n\\s+destination: ${p}/index\\.html`));
    }
  });
});
