import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FeatureCollection } from 'geojson';
import { subprefeituraIdDoPonto, podeSalvar, pontoDoLocal, ROTULO_TIPO } from '../../../features/locais/regras';

const leve = JSON.parse(readFileSync(join(__dirname, '../../../../public/subprefeituras-leve.geojson'), 'utf8')) as FeatureCollection;
const subs = [{ id: 'm', nome: 'Mooca' }];

describe('subprefeituraIdDoPonto', () => {
  it('acha a subprefeitura pelo nome', () => {
    expect(subprefeituraIdDoPonto({ lat: -23.5505, lon: -46.5967 }, leve, subs)).toBe('m');
  });
  it('fora de SP e geojson nulo dão null', () => {
    expect(subprefeituraIdDoPonto({ lat: -22.9099, lon: -47.0626 }, leve, subs)).toBeNull();
    expect(subprefeituraIdDoPonto({ lat: -23.5505, lon: -46.5967 }, null, subs)).toBeNull();
  });
});

describe('podeSalvar', () => {
  it('só endereço do geocoder', () => {
    expect(podeSalvar({ lat: 1, lon: 1, rotulo: 'x', fonte: 'endereco' })).toBe(true);
    expect(podeSalvar({ lat: 1, lon: 1, rotulo: 'x' })).toBe(false);
    expect(podeSalvar(null)).toBe(false);
  });
});

describe('pontoDoLocal e rótulos', () => {
  it('converte sem fonte', () => {
    const p = pontoDoLocal({ tipo: 'CASA', latitude: 1, longitude: 2, rotulo: 'R', subprefeituraId: 'm', subprefeituraNome: 'Mooca' });
    expect(p).toEqual({ lat: 1, lon: 2, rotulo: 'R' });
    expect(ROTULO_TIPO.TRABALHO).toBe('Trabalho');
  });
});
