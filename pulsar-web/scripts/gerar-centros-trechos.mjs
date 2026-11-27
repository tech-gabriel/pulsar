// Centros (lon, lat) de cada trecho da grade H3, para a mancha do mapa sem baixar o GeoJSON pesado.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const arred = (n) => Math.round(n * 1e5) / 1e5;

export function centrosDaGrade(geojson) {
  const out = {};
  for (const f of geojson.features) {
    const h3 = f.properties?.h3;
    if (!h3) continue;
    const anel = f.geometry.coordinates[0].slice(0, -1); // o último vértice repete o primeiro
    const lon = anel.reduce((s, p) => s + p[0], 0) / anel.length;
    const lat = anel.reduce((s, p) => s + p[1], 0) / anel.length;
    out[h3] = [arred(lon), arred(lat)];
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const cidade of ['sao-paulo', 'baixada-santista']) {
    const grade = JSON.parse(readFileSync(new URL(`../public/grade-${cidade}.geojson`, import.meta.url), 'utf8'));
    writeFileSync(new URL(`../public/centros-${cidade}.json`, import.meta.url), JSON.stringify(centrosDaGrade(grade)));
  }
}
