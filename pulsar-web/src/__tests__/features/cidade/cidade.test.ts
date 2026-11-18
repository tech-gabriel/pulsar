import { describe, it, expect } from 'vitest';
import { CIDADE_ATUAL, areaPorSlug, areasDaCidade, cidadeInicial, cidadesDasAreas, idDaArea, lugarDaArea, nomeDaCobertura, rotuloAreas, zonaDaArea } from '../../../features/cidade/cidade';

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

// D1 (escolha do user, 18/11/2026): seletor de cidade no painel. As cidades vêm da lista da API,
// então uma cidade nova entra sem código.
describe('cidades no painel', () => {
  const sp = { id: 's1', nome: 'Itaquera', zona: 'Leste', cidade: 'São Paulo' };
  const se: { id: string; nome: string; zona: string; cidade?: string } = { id: 's2', nome: 'Sé', zona: 'Centro' }; // snapshot do SSG: sem cidade
  const santos = { id: 'b1', nome: 'Santos', zona: 'Baixada Santista', cidade: 'Baixada Santista' };
  const sv = { id: 'b2', nome: 'São Vicente', zona: 'Baixada Santista', cidade: 'Baixada Santista' };

  it('a cidade com mais áreas primeiro (a API pode listar a Baixada antes); sem cidade conta como São Paulo', () => {
    expect(cidadesDasAreas([santos, sp, se, sv, { ...sp, id: 's3' }])).toEqual(['São Paulo', 'Baixada Santista']);
    expect(cidadesDasAreas([se])).toEqual(['São Paulo']);
    expect(areasDaCidade([sp, santos, se, sv], 'São Paulo')).toEqual([sp, se]);
  });

  it('cidade de partida: a lembrada, senão a da maioria das favoritas, senão a primeira', () => {
    const cidades = ['São Paulo', 'Baixada Santista'];
    expect(cidadeInicial(cidades, [sp], 'Baixada Santista')).toBe('Baixada Santista');
    expect(cidadeInicial(cidades, [santos, sv, sp], 'Curitiba')).toBe('Baixada Santista');
    expect(cidadeInicial(cidades, [], null)).toBe('São Paulo');
  });

  it('o nome das áreas de cada cidade', () => {
    expect(rotuloAreas('São Paulo', 32)).toBe('32 subprefeituras');
    expect(rotuloAreas('Baixada Santista', 9)).toBe('9 municípios');
    expect(rotuloAreas('Baixada Santista', 1)).toBe('1 município');
  });

  it('o link ?regiao= acha a área de qualquer cidade pelo nome', () => {
    expect(areaPorSlug('santos', [sp, santos])).toBe(santos);
    expect(areaPorSlug('sao-vicente', [sv])).toBe(sv);
    expect(areaPorSlug('nada', [sp, santos])).toBeNull();
  });
});
