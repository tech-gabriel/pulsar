// Regenera public/sitemap.xml a partir das URLs institucionais + zonas + subprefeituras.
// Roda no build (antes do vite build) para não divergir do routeamento. Os slugs
// vêm das chaves dos snapshots JSON (o .ts não é importável em todo Node do build).
// O teste seo-consistencia.test.ts garante que batem com regiaoPaths().
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ORIGIN = 'https://app-pulsar.com.br';
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const lerJson = (arq) => JSON.parse(readFileSync(join(raiz, 'src', 'data', arq), 'utf8'));

const institucionais = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/sobre', changefreq: 'monthly', priority: '0.7' },
  { loc: '/novidades', changefreq: 'weekly', priority: '0.6' },
  { loc: '/privacidade', changefreq: 'yearly', priority: '0.3' },
  { loc: '/termos', changefreq: 'yearly', priority: '0.3' },
];
const zonasUrls = Object.keys(lerJson('regioes-snapshot.json').zonas).map((s) => ({
  loc: `/risco-de-alagamento/${s}`, changefreq: 'weekly', priority: '0.8',
}));
// lastmod só onde é verdadeiro: as páginas de subprefeitura mudam quando o
// snapshot de ocorrências é regerado (todo build e o deploy semanal agendado).
const ocorrencias = lerJson('ocorrencias-snapshot.json');
const subsUrls = Object.keys(ocorrencias.subprefeituras).map((s) => ({
  loc: `/risco-de-alagamento/${s}`, changefreq: 'weekly', priority: '0.7', lastmod: ocorrencias.geradoEm,
}));

const todas = [...institucionais, ...zonasUrls, ...subsUrls];
const urls = todas
  .map((u) => `  <url>\n    <loc>${ORIGIN}${u.loc}</loc>\n${u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : ''}    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`)
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
writeFileSync(join(raiz, 'public', 'sitemap.xml'), xml);
console.log('sitemap gerado com', todas.length, 'URLs');
