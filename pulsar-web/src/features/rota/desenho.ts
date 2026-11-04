import type { Feature, FeatureCollection, LineString, Position } from 'geojson';

// Distância plana com o grau de longitude encolhido pela latitude: para cortar a linha basta
// a proporção, e numa cidade o erro disso é desprezível.
function dist(a: Position, b: Position): number {
  const k = Math.cos((a[1] * Math.PI) / 180);
  return Math.hypot((b[0] - a[0]) * k, b[1] - a[1]);
}

/** Origem e destino: a linha só se redesenha quando eles mudam (cor nova não redesenha). */
export function chaveGeometria(rota: FeatureCollection): string {
  return rota.features
    .filter((f) => f.geometry.type === 'Point')
    .map((f) => (f.geometry as { coordinates: Position }).coordinates.join(','))
    .join('|');
}

/**
 * A rota até a fração `t` do comprimento (0 a 1): os trechos cortados, a origem e o destino
 * (o mapa só mostra o destino quando a linha chega, para ele "nascer").
 */
export function cortarRota(rota: FeatureCollection, t: number): FeatureCollection {
  const linhas = rota.features.filter((f): f is Feature<LineString> => f.geometry.type === 'LineString');
  const total = linhas.reduce((s, f) => s + f.geometry.coordinates.slice(1).reduce((acc, c, i) => acc + dist(f.geometry.coordinates[i], c), 0), 0);
  let resta = Math.max(0, Math.min(1, t)) * total;
  const completo = t >= 1;
  const saida: Feature[] = [];

  linhas.forEach((f) => {
    const cs = f.geometry.coordinates;
    if (completo) { saida.push(f); return; }
    if (resta <= 0) return;
    const parte: Position[] = [cs[0]];
    for (let i = 1; i < cs.length && resta > 0; i++) {
      const d = dist(cs[i - 1], cs[i]);
      if (d <= resta) { parte.push(cs[i]); resta -= d; continue; }
      const r = resta / d;
      parte.push([cs[i - 1][0] + (cs[i][0] - cs[i - 1][0]) * r, cs[i - 1][1] + (cs[i][1] - cs[i - 1][1]) * r]);
      resta = 0;
    }
    if (parte.length > 1) saida.push({ ...f, geometry: { type: 'LineString', coordinates: parte } });
  });

  const pontos = rota.features.filter((f) => f.geometry.type === 'Point');
  return { type: 'FeatureCollection', features: [...saida, ...pontos] };
}
