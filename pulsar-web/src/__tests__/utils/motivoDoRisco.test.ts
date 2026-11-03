import { describe, it, expect } from 'vitest';
import { motivoDoRisco } from '../../utils/risco';

describe('motivoDoRisco', () => {
  it('sem risco não tem motivo', () => {
    expect(motivoDoRisco({ faixa: 'BAIXO', perigoPrincipal: 'ALAGAMENTO', chuva3hMm: 0 })).toBeNull();
    expect(motivoDoRisco({ faixa: null })).toBeNull();
  });
  it('chuva com uma casa decimal', () => {
    expect(motivoDoRisco({ faixa: 'MODERADO', perigoPrincipal: 'ALAGAMENTO', chuva3hMm: 12.34 })).toBe('Por chuva: 12,3 mm nas últimas 3h');
  });
  it('vento e calor com a leitura', () => {
    expect(motivoDoRisco({ faixa: 'ALTO', perigoPrincipal: 'VENTO', ventoKmH: 61.6 })).toBe('Por vento de 62 km/h');
    expect(motivoDoRisco({ faixa: 'MODERADO', perigoPrincipal: 'CALOR', sensacaoTermica: 37.2 })).toBe('Por calor: sensação de 37 °C');
  });
  it('vento sem leitura cai na chuva', () => {
    expect(motivoDoRisco({ faixa: 'MODERADO', perigoPrincipal: 'VENTO', chuva3hMm: 0 })).toBe('Por chuva: 0,0 mm nas últimas 3h');
  });
});
