import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FeatureCollection } from 'geojson';
import { escolherDestinoComoChegar, rotuloDoPino, rotuloDoTrecho } from '../../../features/rota/destino';
import type { SubprefeituraMapaDto } from '../../../types';

const leve = JSON.parse(
  readFileSync(join(__dirname, '../../../../public/subprefeituras-leve.geojson'), 'utf8'),
) as FeatureCollection;
const mooca = { nome: 'Mooca', latitude: -23.5485, longitude: -46.5972 } as SubprefeituraMapaDto;
const paulista = { lat: -23.5614, lon: -46.6559 }; // Sé, fora da Mooca
const naMooca = { lat: -23.5502, lon: -46.6, };

describe('destino do "Como chegar"', () => {
  it('busca em outra subprefeitura e toque na Mooca: vai para o centro da Mooca', () => {
    expect(escolherDestinoComoChegar(mooca, paulista, 'Av. Paulista', leve))
      .toEqual({ lat: mooca.latitude, lon: mooca.longitude, rotulo: 'Mooca' });
  });

  it('busca dentro da Mooca: usa o endereço buscado', () => {
    expect(escolherDestinoComoChegar(mooca, naMooca, 'Rua da Mooca, 1000', leve))
      .toEqual({ ...naMooca, rotulo: 'Rua da Mooca, 1000' });
  });

  it('localização (com precisão) não vira destino, mesmo dentro da subprefeitura', () => {
    expect(escolherDestinoComoChegar(mooca, { ...naMooca, precisao: 30 }, null, leve).rotulo).toBe('Mooca');
  });

  it('sem ponto: centro da subprefeitura', () => {
    expect(escolherDestinoComoChegar(mooca, null, null, leve).lat).toBe(mooca.latitude);
  });

  // Quem buscou um endereço vai exatamente para ele, mesmo tendo tocado num trecho depois.
  it('endereço buscado na subprefeitura ganha do trecho tocado', () => {
    const trecho = { lat: -23.555, lon: -46.59 };
    expect(escolherDestinoComoChegar(mooca, naMooca, 'Rua da Mooca, 1000', leve, trecho))
      .toEqual({ ...naMooca, rotulo: 'Rua da Mooca, 1000' });
  });

  it('sem endereço buscado aqui, o trecho tocado ganha do centro', () => {
    const trecho = { lat: -23.555, lon: -46.59 };
    expect(escolherDestinoComoChegar(mooca, paulista, 'Av. Paulista', leve, trecho))
      .toEqual({ ...trecho, rotulo: 'Trecho na Mooca' });
  });
});

describe('rótulo do destino num trecho tocado', () => {
  it('com a rua: perto da rua, com o artigo certo', () => {
    expect(rotuloDoTrecho('Mooca', 'Rua Taquari')).toBe('Perto da Rua Taquari');
    expect(rotuloDoTrecho('Mooca', 'Viaduto Bresser')).toBe('Perto do Viaduto Bresser');
  });
  it('sem a rua: a região, com a preposição dela', () => {
    expect(rotuloDoTrecho('Mooca', null)).toBe('Trecho na Mooca');
    expect(rotuloDoTrecho('Butantã', null)).toBe('Trecho no Butantã');
  });
});

describe('rótulo do pino arrastado', () => {
  it('em cima da rua leva o nome dela; longe, só perto', () => {
    expect(rotuloDoPino('Mooca', 'Rua Taquari', 20)).toBe('Rua Taquari, Mooca');
    expect(rotuloDoPino('Mooca', 'Rua Taquari', 200)).toBe('Perto da Rua Taquari, Mooca');
  });
});

describe('rótulo do destino: abreviações e palavras femininas', () => {
  it('abreviação com ponto e ponte levam "da"', () => {
    expect(rotuloDoTrecho('Sé', 'Av. Paulista')).toBe('Perto da Av. Paulista');
    expect(rotuloDoTrecho('Sé', 'Praça da Sé')).toBe('Perto da Praça da Sé');
    expect(rotuloDoTrecho('Mooca', 'Ponte Pequena')).toBe('Perto da Ponte Pequena');
  });
});
