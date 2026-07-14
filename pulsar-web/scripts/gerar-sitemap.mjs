// Regenera public/sitemap.xml a partir das URLs institucionais + zonas.
// Roda no build (antes do vite build) para não divergir do routeamento.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ORIGIN = 'https://app-pulsar.com.br';
const institucionais = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/sobre', changefreq: 'monthly', priority: '0.7' },
  { loc: '/novidades', changefreq: 'weekly', priority: '0.6' },
  { loc: '/privacidade', changefreq: 'yearly', priority: '0.3' },
  { loc: '/termos', changefreq: 'yearly', priority: '0.3' },
];
const zonasSlugs = ['zona-centro', 'zona-leste', 'zona-norte', 'zona-oeste', 'zona-sul'];
const zonasUrls = zonasSlugs.map((s) => ({
  loc: `/risco-de-alagamento/${s}`, changefreq: 'weekly', priority: '0.8',
}));

const urls = [...institucionais, ...zonasUrls]
  .map((u) => `  <url>\n    <loc>${ORIGIN}${u.loc}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`)
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
const dest = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sitemap.xml');
writeFileSync(dest, xml);
console.log('sitemap gerado com', institucionais.length + zonasUrls.length, 'URLs');
