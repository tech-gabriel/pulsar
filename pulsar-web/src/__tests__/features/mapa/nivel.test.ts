import { describe, expect, it } from 'vitest';
import { corDoAnel, nivelDaArea, rumo } from '../../../features/mapa/nivel';
import { PALETA } from '../../../utils/paleta';
import type { FaixaRisco, LeituraDto, SubprefeituraMapaDto } from '../../../types';

const leitura = (o: Partial<LeituraDto> = {}): LeituraDto => ({
  chuvaMmH: 0, ventoKmH: 0, visibilidadeKm: 10, indiceUv: 1, temperaturaC: 25,
  sensacaoTermica: 25, umidade: 50, timestamp: '2026-11-27T12:00:00Z', ...o,
});

function sub(o: {
  faixa?: FaixaRisco; valor?: number; alag?: FaixaRisco; vento?: FaixaRisco; calor?: FaixaRisco;
  perigo?: 'ALAGAMENTO' | 'VENTO' | 'CALOR'; leitura?: Partial<LeituraDto> | null; semScore?: boolean;
}): SubprefeituraMapaDto {
  const f = o.faixa ?? 'BAIXO';
  return {
    id: 'x', nome: 'Mooca', latitude: 0, longitude: 0, zona: 'Leste',
    faixaRisco: f, temperaturaAtual: 25,
    scoreAtual: o.semScore ? null : {
      valor: o.valor ?? 10, faixa: f, timestamp: '', perigoPrincipal: o.perigo ?? 'ALAGAMENTO',
      componentes: {
        alagamento: { valor: 0, faixa: o.alag ?? 'BAIXO' },
        vento: { valor: 0, faixa: o.vento ?? 'BAIXO' },
        calor: { valor: 0, faixa: o.calor ?? 'BAIXO' },
      },
    },
    ultimaLeitura: o.leitura === null ? null : leitura(o.leitura),
  } as SubprefeituraMapaDto;
}

describe('nivelDaArea', () => {
  it('risco alto vira alerta', () => {
    const n = nivelDaArea(sub({ faixa: 'ALTO', valor: 77.6 }), 'score');
    expect(n).toMatchObject({ nivel: 'alerta', banda: 2, cor: '#D62C2C', valor: '78' });
  });
  it('risco moderado vira atencao', () => {
    expect(nivelDaArea(sub({ faixa: 'MODERADO' }), 'score')).toMatchObject({ nivel: 'atencao', banda: 1, cor: '#F2C200' });
  });
  it('sem score vira semDado', () => {
    expect(nivelDaArea(sub({ semScore: true }), 'score')).toMatchObject({ nivel: 'semDado', valor: null, cor: PALETA.neutro, motivo: null });
  });
  it('risco tranquilo nao tem motivo', () => {
    expect(nivelDaArea(sub({}), 'score')).toMatchObject({ nivel: 'tranquilo', cor: '#22C55E', motivo: null });
  });
  it('risco traduz o perigo principal', () => {
    expect(nivelDaArea(sub({ faixa: 'ALTO', perigo: 'VENTO' }), 'score').perigo).toBe('vento');
  });

  it('temperatura atencao com sensacao 37', () => {
    const n = nivelDaArea(sub({ calor: 'MODERADO', leitura: { sensacaoTermica: 37 } }), 'temperatura');
    expect(n).toMatchObject({ nivel: 'atencao', valor: '37°', motivo: 'Sensação de 37 °C', perigo: 'calor' });
  });
  it('temperatura sem leitura vira semDado', () => {
    expect(nivelDaArea(sub({ leitura: null }), 'temperatura').nivel).toBe('semDado');
  });

  it.each([[15, 0, PALETA.neutro], [30, 1, PALETA.amarelo], [50, 2, PALETA.ambar], [61, 3, PALETA.vermelho]])(
    'vento %s km/h banda %s', (v, banda, cor) => {
      expect(nivelDaArea(sub({ leitura: { ventoKmH: v } }), 'vento')).toMatchObject({ banda, cor });
    });
  it('vento usa a faixa do componente e cita o rumo', () => {
    const n = nivelDaArea(sub({ vento: 'ALTO', leitura: { ventoKmH: 61, ventoDirecaoGraus: 315 } }), 'vento');
    expect(n).toMatchObject({ nivel: 'alerta', motivo: 'Vento de 61 km/h, vindo de noroeste', perigo: 'vento' });
    const m = nivelDaArea(sub({ vento: 'ALTO', leitura: { ventoKmH: 61, ventoDirecaoGraus: null } }), 'vento');
    expect(m.motivo).toBe('Vento de 61 km/h');
  });

  it('chuva mostra mm/h com virgula', () => {
    const n = nivelDaArea(sub({ alag: 'MODERADO', leitura: { chuvaMmH: 4.2 } }), 'chuva');
    expect(n).toMatchObject({ valor: '4,2', nivel: 'atencao', perigo: 'chuva', motivo: 'Chuva de 4,2 mm/h' });
  });
});

describe('corDoAnel e rumo', () => {
  it('escurece a 78%', () => expect(corDoAnel('#F2C200')).toBe('#BD9700'));
  it('rumo', () => {
    expect(rumo(315)).toBe('noroeste');
    expect(rumo(0)).toBe('norte');
    expect(rumo(null)).toBeNull();
  });
});
