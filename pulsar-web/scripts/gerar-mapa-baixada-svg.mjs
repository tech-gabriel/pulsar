// Converte public/baixada-santista-leve.geojson (já simplificado) no módulo
// src/components/landing/mapaBaixadaPaths.ts, projetado em coordenadas de viewBox.
// Rodar sob demanda (`npm run mapa:svg:baixada`); o arquivo gerado é commitado.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url));
const ENTRADA = resolve(aqui, '../public/baixada-santista-leve.geojson');
const SAIDA = resolve(aqui, '../src/components/landing/mapaBaixadaPaths.ts');

const LARGURA = 1000;     // largura do viewBox; a altura sai da proporção real
const CASAS = 1;
const COS_LAT = Math.cos((-24 * Math.PI) / 180);
const MIN_VERTICES = 25;  // anéis com 25 vértices ou menos são ilhas minúsculas: ruído

const slug = (nome) => nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const geo = JSON.parse(readFileSync(ENTRADA, 'utf8'));
const aneisDe = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).map((p) => p[0]);
const feicoes = geo.features.map((f) => ({
  nome: f.properties.nm_subprefeitura,
  aneis: aneisDe(f.geometry).filter((a) => a.length > MIN_VERTICES),
}));

let lonMin = Infinity, lonMax = -Infinity, latMin = Infinity, latMax = -Infinity;
for (const f of feicoes) for (const a of f.aneis) for (const [lon, lat] of a) {
  lonMin = Math.min(lonMin, lon); lonMax = Math.max(lonMax, lon);
  latMin = Math.min(latMin, lat); latMax = Math.max(latMax, lat);
}
const escala = LARGURA / ((lonMax - lonMin) * COS_LAT);
const ALTURA = +((latMax - latMin) * escala).toFixed(CASAS);
const proj = ([lon, lat]) => `${+((lon - lonMin) * COS_LAT * escala).toFixed(CASAS)} ${+((latMax - lat) * escala).toFixed(CASAS)}`;

const paths = feicoes
  .map((f) => ({
    id: slug(f.nome),
    nome: f.nome,
    d: f.aneis.map((a) => a.map((p, i) => `${i === 0 ? 'M' : 'L'}${proj(p)}`).join('') + 'Z').join(''),
  }))
  .sort((a, b) => a.id.localeCompare(b.id));

writeFileSync(SAIDA, `// GERADO por scripts/gerar-mapa-baixada-svg.mjs, não editar à mão.
// Fonte: public/baixada-santista-leve.geojson. Regenerar com: npm run mapa:svg:baixada

export const VIEWBOX_BAIXADA = '0 0 ${LARGURA} ${ALTURA}';

/** \`id\` é o slug do município (o mesmo de data/baixada-seo). */
export const MUNICIPIOS_PATHS: { id: string; nome: string; d: string }[] = ${JSON.stringify(paths, null, 2)};
`, 'utf8');
console.log(`mapaBaixadaPaths.ts gerado: ${paths.length} municípios.`);
