import { describe, it, expect } from 'vitest';
import { CIDADE_ATUAL, idDaArea } from '../../../features/cidade/cidade';

describe('CIDADE_ATUAL e idDaArea', () => {
  it('o id de cada desenho sai do nome pela mesma regra do app', () => {
    for (const a of CIDADE_ATUAL.areas) expect(a.id).toBe(idDaArea(a.nome));
  });
  it("nomes do banco casam com o desenho, inclusive M'Boi Mirim e acentos", () => {
    const ids = CIDADE_ATUAL.areas.map((a) => a.id);
    for (const nome of ["M'Boi Mirim", 'São Miguel', 'Sé', 'Casa Verde-Limão-Cachoeirinha']) expect(ids).toContain(idDaArea(nome));
  });
});
