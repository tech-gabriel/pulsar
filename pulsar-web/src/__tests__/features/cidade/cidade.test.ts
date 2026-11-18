import { describe, it, expect } from 'vitest';
import { CIDADE_ATUAL, idDaArea, lugarDaArea, nomeDaCobertura, zonaDaArea } from '../../../features/cidade/cidade';

describe('CIDADE_ATUAL e idDaArea', () => {
  it('o id de cada desenho sai do nome pela mesma regra do app', () => {
    for (const a of CIDADE_ATUAL.areas) expect(a.id).toBe(idDaArea(a.nome));
  });
  it("nomes do banco casam com o desenho, inclusive M'Boi Mirim e acentos", () => {
    const ids = CIDADE_ATUAL.areas.map((a) => a.id);
    for (const nome of ["M'Boi Mirim", 'São Miguel', 'Sé', 'Casa Verde-Limão-Cachoeirinha']) expect(ids).toContain(idDaArea(nome));
  });
});

// Cada pessoa vê o nome da cobertura que enxerga: a Baixada, escondida até o lançamento,
// não aparece em texto nenhum para a conta comum.
describe('nomeDaCobertura, zonaDaArea e lugarDaArea', () => {
  const se = { zona: 'Centro', cidade: 'São Paulo' };
  const itaquera = { zona: 'Leste', cidade: 'São Paulo' };
  const santos = { zona: 'Baixada Santista', cidade: 'Baixada Santista' };

  it('só a capital: "São Paulo capital"; com a Baixada: as duas', () => {
    expect(nomeDaCobertura([se, itaquera])).toBe('São Paulo capital');
    expect(nomeDaCobertura([se, santos])).toBe('São Paulo e Baixada Santista');
    expect(nomeDaCobertura([{}])).toBe('São Paulo capital'); // snapshot do SSG, sem cidade
  });

  it('o lugar de cada área', () => {
    expect(lugarDaArea(se)).toBe('Centro · São Paulo');
    expect(lugarDaArea(itaquera)).toBe('Zona Leste · São Paulo');
    expect(lugarDaArea(santos)).toBe('Baixada Santista');
    expect(zonaDaArea(itaquera)).toBe('Zona Leste');
    expect(zonaDaArea(santos)).toBe('Baixada Santista');
  });
});
