import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { FeatureCollection } from 'geojson';
import {
  distanciaKm,
  pontosPerto,
  pontosDaSubprefeitura,
  subprefeituraDoDistrito,
  subprefeituraDoPonto,
  periodoLegivel,
  slugPorNomeApi,
  type Ponto,
} from '../../../features/alagamentosHoje/regras';

const ARQ_LEVE = join(__dirname, '../../../../public/subprefeituras-leve.geojson');
const leve = JSON.parse(readFileSync(ARQ_LEVE, 'utf8')) as FeatureCollection;

const p = (id: string, lat: number, lon: number, sub = 'mooca'): Ponto => ({ id, lat, lon, tipo: 'ALAGAMENTO', data: '2026-03-01', sub });

describe('regras da página de alagamentos hoje', () => {
  it('distanciaKm: um grau de latitude dá ~111 km', () => {
    expect(distanciaKm({ lat: -23, lon: -46 }, { lat: -24, lon: -46 })).toBeCloseTo(111.19, 1);
  });

  it('pontosPerto: até 2 km entra, logo depois fica fora', () => {
    const centro = { lat: -23.55, lon: -46.6 };
    const umKmEmGraus = 1 / 111.195;
    const dentro = p('dentro', -23.55 + 1.99 * umKmEmGraus, -46.6);
    const fora = p('fora', -23.55 + 2.01 * umKmEmGraus, -46.6);
    expect(pontosPerto([dentro, fora], centro).map((x) => x.id)).toEqual(['dentro']);
  });

  it('pontosDaSubprefeitura filtra pelo slug', () => {
    expect(pontosDaSubprefeitura([p('a', 0, 0, 'mooca'), p('b', 0, 0, 'penha')], 'penha').map((x) => x.id)).toEqual(['b']);
  });

  it('subprefeituraDoDistrito ignora acento e caixa', () => {
    expect(subprefeituraDoDistrito('itaim bibi')?.slug).toBe('pinheiros');
    expect(subprefeituraDoDistrito('TATUAPÉ')?.slug).toBe('mooca');
    expect(subprefeituraDoDistrito('Bairro que não existe')).toBeUndefined();
  });

  it('subprefeituraDoPonto acha a subprefeitura pelo contorno leve e devolve null fora da cidade', () => {
    expect(subprefeituraDoPonto(-23.5505, -46.6333, leve)?.slug).toBe('se');
    expect(subprefeituraDoPonto(-23.4628, -46.5333, leve)).toBeNull(); // Guarulhos
  });

  it('o contorno leve tem as 32 subprefeituras e é leve', () => {
    expect(leve.features).toHaveLength(32);
    expect(leve.features.every((f) => typeof f.properties?.nm_subprefeitura === 'string')).toBe(true);
    expect(statSync(ARQ_LEVE).size).toBeLessThan(400_000);
  });

  it('periodoLegivel nos três formatos', () => {
    expect(periodoLegivel({ de: '2026-01-04', ate: '2026-08-30' })).toBe('de janeiro a agosto de 2026');
    expect(periodoLegivel({ de: '2026-03-02', ate: '2026-03-20' })).toBe('em março de 2026');
    expect(periodoLegivel({ de: '2025-12-10', ate: '2026-02-01' })).toBe('de dezembro de 2025 a fevereiro de 2026');
  });

  it('slugPorNomeApi casa o nome da API com o slug da página', () => {
    expect(slugPorNomeApi('Mooca')).toBe('mooca');
    expect(slugPorNomeApi("M'Boi Mirim")).toBe('mboi-mirim');
    expect(slugPorNomeApi('Nada')).toBeUndefined();
  });
});
