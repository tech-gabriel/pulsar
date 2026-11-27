import type { SubprefeituraMapaDto } from '../../types';
import type { CamadaMapa } from './nivel';

/** Vento no centro de um trecho: para onde sopra (radianos, 0 = norte, sentido horário) e a força. */
export interface PontoVento { lon: number; lat: number; paraRad: number; kmh: number }

/** Um ponto por trecho das áreas que têm direção (0 = norte vale) e vento acima de zero. */
export function campoDoVento(
  areas: SubprefeituraMapaDto[],
  celulas: { h3: string; areaId: string }[],
  centros: Record<string, [number, number]>,
): PontoVento[] {
  const porId = new Map(areas.map((a) => [a.id, a]));
  const pontos: PontoVento[] = [];
  for (const { h3, areaId } of celulas) {
    const l = porId.get(areaId)?.ultimaLeitura;
    const c = centros[h3];
    if (!l || l.ventoDirecaoGraus == null || !(l.ventoKmH > 0) || !c) continue;
    // A leitura diz de onde o vento vem; o tracinho anda para o lado oposto.
    pontos.push({ lon: c[0], lat: c[1], paraRad: (((l.ventoDirecaoGraus + 180) % 360) * Math.PI) / 180, kmh: l.ventoKmH });
  }
  return pontos;
}

/** Passo na tela por quadro: 60 km/h anda uns 1,7 px (lento e legível na cidade toda). */
export const pxPorQuadro = (kmh: number): number => 0.35 + kmh * 0.022;

/** O vento real faz curvas: um desvio suave do rumo, que muda com o lugar (ondas de uns 8 a 10 km). */
export const desvio = (lon: number, lat: number): number =>
  0.42 * Math.sin(lon * 62 + lat * 18) + 0.3 * Math.cos(lat * 75 - lon * 21);

/** Só gasta quadro com a camada Vento aberta, aba visível e campo; reduzir movimento deixa parado. */
export function deveAnimar(o: { camada: CamadaMapa; reduzido: boolean; visivel: boolean; temCampo: boolean }): 'animar' | 'parado' | 'nada' {
  if (o.camada !== 'vento' || !o.visivel || !o.temCampo) return 'nada';
  return o.reduzido ? 'parado' : 'animar';
}
