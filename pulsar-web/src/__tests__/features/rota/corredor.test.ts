import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FeatureCollection } from 'geojson';
import { tracarCorredor, idsDosTrechos, idsDaRota } from '../../../features/rota/corredor';
import { TEXTO_SERRA } from '../../../features/rota/textos';
import { comContornosDaBaixada } from '../../../utils/geo';

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
    expect(idsDosTrechos(['SE', 'BUTANTA', 'SE'], subs)).toEqual(['a', 'b']);
  });
});

describe('corredor + idsDosTrechos', () => {
  it('diagonal Sé para Mooca (nomes repetem) gera ids únicos', () => {
    const c = tracarCorredor(se, { lat: -23.5650, lon: -46.5850, rotulo: 'x' }, leve);
    if (!c.ok) throw new Error('fora');
    const ids = idsDosTrechos(c.nomes, [{ id: 'se', nome: 'Sé' }, { id: 'mo', nome: 'Mooca' }]);
    expect(c.nomes.length).toBeGreaterThan(2);
    expect(ids).toEqual(['se', 'mo']);
  });
});

// Capital ↔ Baixada: a rota avalia só as pontas (saída e chegada) e diz que a serra fica de fora.
describe('rota entre cidades', () => {
  const baixada = JSON.parse(
    readFileSync(join(__dirname, '../../../../public/baixada-santista-leve.geojson'), 'utf8'),
  ) as FeatureCollection;
  const juntos = comContornosDaBaixada(leve, baixada);
  const subs = [
    { id: 'se', nome: 'Sé', cidade: 'São Paulo' },
    { id: 'mooca', nome: 'Mooca', cidade: 'São Paulo' },
    { id: 'vm', nome: 'Vila Mariana', cidade: 'São Paulo' },
    { id: 'jab', nome: 'Jabaquara', cidade: 'São Paulo' },
    { id: 'parelheiros', nome: 'Parelheiros', cidade: 'São Paulo' },
    { id: 'santos', nome: 'Santos', cidade: 'Baixada Santista' },
    { id: 'sv', nome: 'São Vicente', cidade: 'Baixada Santista' },
    { id: 'itanhaem', nome: 'Itanhaém', cidade: 'Baixada Santista' },
    { id: 'bertioga', nome: 'Bertioga', cidade: 'Baixada Santista' },
  ];
  const santos = { lat: -23.9608, lon: -46.3336, rotulo: 'Santos' };

  it('Sé para Santos: avalia as duas pontas e atravessa a serra', () => {
    const corredor = tracarCorredor(se, santos, juntos);
    expect(idsDaRota(corredor, subs)).toEqual({ ids: ['se', 'santos'], atravessaSerra: true, textoSerra: 'A serra não é avaliada: confira a Ecovias antes de descer' });
  });

  it('Marsilac para Itanhaém: cidades diferentes, mesmo sendo vizinhas', () => {
    const corredor = tracarCorredor({ lat: -23.916332, lon: -46.727397, rotulo: 'Marsilac' }, { lat: -24.1831, lon: -46.7889, rotulo: 'Itanhaém' }, juntos);
    expect(idsDaRota(corredor, subs)).toEqual({ ids: ['parelheiros', 'itanhaem'], atravessaSerra: true, textoSerra: 'A serra não é avaliada: confira a Ecovias antes de descer' });
  });

  it('Sé para Mooca: igual a hoje', () => {
    const corredor = tracarCorredor(se, mooca, juntos);
    expect(idsDaRota(corredor, subs)).toEqual({ ids: idsDosTrechos(corredor.ok ? corredor.nomes : [], subs), atravessaSerra: false, textoSerra: null });
  });

  it('conta comum (sem a Baixada no contorno): Santos fica fora', () => {
    expect(tracarCorredor(se, santos, leve)).toEqual({ ok: false, motivo: 'destinoFora' });
  });

  it('o texto da serra é o do desenho aprovado', () => {
    expect(TEXTO_SERRA).toBe('A serra não é avaliada: confira a Ecovias antes de descer');
  });

  // Decisão do user (18/11/2026): o texto segue o sentido; Bertioga (Mogi-Bertioga) não é da Ecovias.
  it('subindo, o texto diz subir', () => {
    const corredor = tracarCorredor(santos, se, juntos);
    expect(idsDaRota(corredor, subs).textoSerra).toBe('A serra não é avaliada: confira a Ecovias antes de subir');
  });

  it('com Bertioga numa das pontas, a estrada não é a da Ecovias', () => {
    const corredor = tracarCorredor(se, { lat: -23.8486, lon: -46.1396, rotulo: 'Bertioga' }, juntos);
    expect(idsDaRota(corredor, subs).textoSerra).toBe('A serra não é avaliada: confira as condições da estrada antes de ir');
  });
});
