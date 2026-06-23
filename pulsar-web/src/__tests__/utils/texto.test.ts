import { describe, it, expect } from 'vitest';
import { normalizarNome } from '../../utils/texto';

describe('normalizarNome', () => {
  it('remove acentos e baixa a caixa (GeoJSON x banco)', () => {
    expect(normalizarNome('Butantã')).toBe(normalizarNome('BUTANTA'));
    expect(normalizarNome('Jaçanã-Tremembé')).toBe(normalizarNome('JACANA-TREMEMBE'));
  });

  it('colapsa espaços e apara as pontas', () => {
    expect(normalizarNome('  Campo   Limpo  ')).toBe('campo limpo');
  });

  it("casa M'Boi Mirim (banco) com M BOI MIRIM (GeoJSON) — apóstrofo vira espaço", () => {
    expect(normalizarNome("M'Boi Mirim")).toBe(normalizarNome('M BOI MIRIM'));
    expect(normalizarNome("M'Boi Mirim")).toBe('m boi mirim');
  });

  it('trata apóstrofo tipográfico (’) igual ao reto (bug São Miguel/M’Boi)', () => {
    expect(normalizarNome('M’Boi Mirim')).toBe('m boi mirim');
  });

  it('casa São Miguel (banco, após alinhamento) com SAO MIGUEL (GeoJSON)', () => {
    expect(normalizarNome('São Miguel')).toBe(normalizarNome('SAO MIGUEL'));
  });
});
