import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FeatureCollection } from 'geojson';
import { tracarCorredor, idsDosTrechos } from '../../../features/rota/corredor';

const leve = JSON.parse(
  readFileSync(join(__dirname, '../../../../public/subprefeituras-leve.geojson'), 'utf8'),
) as FeatureCollection;

const se = { lat: -23.5505, lon: -46.6333, rotulo: 'Sé' };
const mooca = { lat: -23.5450, lon: -46.6000, rotulo: 'Mooca' };

describe('corredor', () => {
  it('Sé para Mooca passa pelas duas, na ordem', () => {
    const c = tracarCorredor(se, mooca, leve);
    expect(c.ok && c.nomes).toEqual(['SE', 'MOOCA']);
  });

  it('origem e destino na mesma subprefeitura dá um nome só', () => {
    const c = tracarCorredor(se, { lat: -23.5520, lon: -46.6300, rotulo: 'perto' }, leve);
    expect(c.ok && c.nomes).toEqual(['SE']);
  });

  it('origem fora de SP', () => {
    expect(tracarCorredor({ lat: -22.9, lon: -43.2, rotulo: 'Rio' }, se, leve)).toEqual({ ok: false, motivo: 'origemFora' });
  });

  it('destino fora de SP', () => {
    expect(tracarCorredor(se, { lat: -22.9, lon: -43.2, rotulo: 'Rio' }, leve)).toEqual({ ok: false, motivo: 'destinoFora' });
  });

  it('ponto do meio fora dos polígonos é ignorado e não repete nomes seguidos', () => {
    // Perus ao norte até Parelheiros ao sul: a reta sai do município em algum ponto
    const c = tracarCorredor({ lat: -23.40, lon: -46.75, rotulo: 'a' }, { lat: -23.85, lon: -46.70, rotulo: 'b' }, leve);
    expect(c.ok).toBe(true);
    if (c.ok) c.nomes.forEach((n, i) => expect(n).not.toBe(c.nomes[i - 1]));
  });
});

describe('idsDosTrechos', () => {
  it('casa nome do mapa com o da API ignorando acento e caixa', () => {
    const subs = [{ id: 'a', nome: 'Sé' }, { id: 'b', nome: 'Butantã' }];
    expect(idsDosTrechos(['SE', 'BUTANTA', 'XXX'], subs)).toEqual(['a', 'b']);
  });
});
