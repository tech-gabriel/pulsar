import { describe, it, expect } from 'vitest';
import {
  ordenarPorRisco, resumoCidade, alertasDoSino, buscarAreas, emAtencao, rotuloPerigo, type Area,
} from '../../../features/cidade/areas';

const area = (id: string, nome: string, valor: number | null, faixa: Area['faixaRisco'] = 'BAIXO', perigo: 'ALAGAMENTO' | 'VENTO' | 'CALOR' = 'ALAGAMENTO'): Area => ({
  id, nome, zona: 'Leste', latitude: 0, longitude: 0, temperaturaAtual: 20, ultimaLeitura: null, faixaRisco: faixa,
  scoreAtual: valor === null ? null : { valor, faixa, timestamp: '2026-10-04T00:00:00Z', perigoPrincipal: perigo },
});

const itaquera = area('s1', 'Itaquera', 78, 'ALTO');
const mooca = area('s2', 'Mooca', 49, 'MODERADO');
const penha = area('s3', 'Penha', 12);
const se = area('s4', 'Sé', 49, 'MODERADO', 'VENTO');
const semNota = area('s5', 'Aricanduva', null);

describe('ordenarPorRisco', () => {
  it('pior primeiro, empate em ordem alfabética, sem nota por último', () => {
    expect(ordenarPorRisco([penha, semNota, se, itaquera, mooca]).map((a) => a.nome))
      .toEqual(['Itaquera', 'Mooca', 'Sé', 'Penha', 'Aricanduva']);
  });
});

describe('resumoCidade', () => {
  it('conta por faixa e aponta a pior', () => {
    const r = resumoCidade([penha, itaquera, mooca, se]);
    expect(r).toMatchObject({ alto: 1, moderado: 2, baixo: 1, semDados: false });
    expect(r.pior?.nome).toBe('Itaquera');
  });
  it('sem nenhuma nota: semDados e sem pior (não é "tranquilo")', () => {
    const r = resumoCidade([semNota]);
    expect(r.semDados).toBe(true);
    expect(r.pior).toBeNull();
  });
  it('lista vazia (API falhou): semDados', () => {
    expect(resumoCidade([]).semDados).toBe(true);
  });
});

describe('alertasDoSino', () => {
  it('pessoal primeiro: conta só as suas em alto; moderado aparece mas não acende', () => {
    const r = alertasDoSino([itaquera, mooca, penha], ['s2', 's3']);
    expect(r.contagem).toBe(0);
    expect(r.suas.map((a) => a.nome)).toEqual(['Mooca']);
    expect(r.naCidade.map((a) => a.nome)).toEqual(['Itaquera']);
  });
  it('favorita em alto acende o sino', () => {
    const r = alertasDoSino([itaquera, mooca], ['s1']);
    expect(r.contagem).toBe(1);
    expect(r.suas.map((a) => a.nome)).toEqual(['Itaquera']);
    expect(r.naCidade).toEqual([]);
  });
  it('sem favoritas: conta o total da cidade em alto', () => {
    const r = alertasDoSino([itaquera, mooca], []);
    expect(r.contagem).toBe(1);
    expect(r.suas).toEqual([]);
  });
});

describe('buscarAreas', () => {
  it('sem acento e por trecho', () => {
    expect(buscarAreas('se', [itaquera, se, mooca]).map((a) => a.nome)).toEqual(['Sé']);
    expect(buscarAreas('moo', [itaquera, se, mooca]).map((a) => a.nome)).toEqual(['Mooca']);
  });
  it('termo vazio não lista nada', () => {
    expect(buscarAreas('  ', [itaquera])).toEqual([]);
  });
});

describe('emAtencao e rotuloPerigo', () => {
  it('só moderado e alto, pior primeiro', () => {
    expect(emAtencao([penha, mooca, itaquera]).map((a) => a.nome)).toEqual(['Itaquera', 'Mooca']);
  });
  it('rótulo do perigo só com risco', () => {
    expect(rotuloPerigo(itaquera)).toBe('alagamento');
    expect(rotuloPerigo(se)).toBe('vento');
    expect(rotuloPerigo(penha)).toBeNull();
  });
});
