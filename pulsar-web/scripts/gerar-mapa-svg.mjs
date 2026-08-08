// Converte public/subprefeituras_wgs84.geojson (4,6 MB) no módulo
// src/components/landing/mapaPaths.ts, com os polígonos simplificados e já
// projetados em coordenadas de viewBox.
//
// Rodar sob demanda (`npm run mapa:svg`), não no build: o build normal não
// deve carregar os 4,6 MB. O arquivo gerado é commitado.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url));
const ENTRADA = resolve(aqui, '../public/subprefeituras_wgs84.geojson');
const SAIDA = resolve(aqui, '../src/components/landing/mapaPaths.ts');

const LARGURA = 1000;   // largura do viewBox; a altura sai da proporção real
const CASAS = 1;        // casas decimais nas coordenadas de saída

// Tolerância do Douglas-Peucker, em graus brutos: a simplificação roda ANTES
// da projeção, então ela não aplica o `kx` (cosseno da latitude) usado abaixo.
// Na prática a tolerância efetiva em x fica ~8% menor que em y (cos(-23,6°) ≈
// 0,917). Sabido e aceito: nesta escala a anisotropia não é visível, e corrigir
// obrigaria a regerar `mapaPaths.ts`, que é artefato commitado e já validado.
// Sobe para simplificar mais, desce para detalhar.
const TOLERANCIA = 0.0009;

// ── Douglas-Peucker ──────────────────────────────────────────────────────────
function distPerpendicular([x, y], [x1, y1], [x2, y2]) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  const tc = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (x1 + tc * dx), y - (y1 + tc * dy));
}

function simplificar(pontos, tolerancia) {
  if (pontos.length <= 2) return pontos;
  let iMax = 0;
  let distMax = 0;
  for (let i = 1; i < pontos.length - 1; i++) {
    const d = distPerpendicular(pontos[i], pontos[0], pontos[pontos.length - 1]);
    if (d > distMax) {
      distMax = d;
      iMax = i;
    }
  }
  if (distMax <= tolerancia) return [pontos[0], pontos[pontos.length - 1]];
  return [
    ...simplificar(pontos.slice(0, iMax + 1), tolerancia).slice(0, -1),
    ...simplificar(pontos.slice(iMax), tolerancia),
  ];
}

function slug(nome) {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Leitura ──────────────────────────────────────────────────────────────────
const geo = JSON.parse(readFileSync(ENTRADA, 'utf8'));
const feicoes = geo.features;

// Extremos para projetar. O anel externo é o índice 0 de cada Polygon.
let lonMin = Infinity, lonMax = -Infinity, latMin = Infinity, latMax = -Infinity;
for (const f of feicoes) {
  for (const [lon, lat] of f.geometry.coordinates[0]) {
    if (lon < lonMin) lonMin = lon;
    if (lon > lonMax) lonMax = lon;
    if (lat < latMin) latMin = lat;
    if (lat > latMax) latMax = lat;
  }
}

// Projeção equiretangular com correção pelo cosseno da latitude média. Na
// escala de uma cidade isso é visualmente indistinguível de Mercator e evita
// dependência de biblioteca de projeção.
const kx = Math.cos(((latMin + latMax) / 2) * (Math.PI / 180));
const escala = LARGURA / ((lonMax - lonMin) * kx);
const ALTURA = +((latMax - latMin) * escala).toFixed(CASAS);

const projetar = ([lon, lat]) => [
  +((lon - lonMin) * kx * escala).toFixed(CASAS),
  +((latMax - lat) * escala).toFixed(CASAS),
];

// ── Conversão ────────────────────────────────────────────────────────────────
const subs = feicoes
  .map((f) => {
    const anel = simplificar(f.geometry.coordinates[0], TOLERANCIA).map(projetar);
    const d = anel.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join('') + 'Z';
    return {
      id: slug(f.properties.nm_subprefeitura),
      nome: f.properties.nm_subprefeitura,
      zona: f.properties.nm_regiao_05,
      d,
    };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

const conteudo = `// GERADO por scripts/gerar-mapa-svg.mjs — não editar à mão.
// Fonte: public/subprefeituras_wgs84.geojson (GeoSampa).
// Regenerar com: npm run mapa:svg

export interface SubprefeituraPath {
  /** Slug de \`nome\`, usado como id de elemento no SVG. */
  id: string;
  nome: string;
  /** Zona (nm_regiao_05): Norte, Sul, Leste, Oeste, Centro. */
  zona: string;
  /** Atributo \`d\` do <path>. */
  d: string;
}

export const VIEWBOX = '0 0 ${LARGURA} ${ALTURA}';

export const SUBPREFEITURAS: SubprefeituraPath[] = ${JSON.stringify(subs, null, 2)};
`;

writeFileSync(SAIDA, conteudo, 'utf8');

const kb = (subs.reduce((t, s) => t + s.d.length, 0) / 1024).toFixed(1);
console.log(`mapaPaths.ts gerado: ${subs.length} subprefeituras, ${kb} KB de paths.`);
