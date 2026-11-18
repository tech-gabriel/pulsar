import { describe, expect, it } from 'vitest';
import { alertasDoSinoOficial, emissorCurto, emissorLegivel, eventoLegivel, nivelOficial, porGravidade } from '../../utils/alertaOficial';
import type { AlertaOficial } from '../../types';
import type { Area } from '../../features/cidade/areas';

const alerta = (gravidade: string, inicio = '2026-11-18T17:00:00Z', identificador = gravidade): AlertaOficial => ({
  identificador, evento: 'CHUVAS INTENSAS', gravidade, emissor: 'Defesa Civil Estadual De São Paulo',
  titulo: 't', descricao: 'd', instrucao: '', inicioUtc: inicio, expiraUtc: '2026-11-18T23:00:00Z',
});

describe('alertaOficial', () => {
  // Escala de cores da Defesa Civil de SP (amarelo, laranja, vermelho), pela severity do CAP.
  it.each([
    ['Extreme', 'vermelho', 'Vermelho'],
    ['Severe', 'laranja', 'Laranja'],
    ['Moderate', 'amarelo', 'Amarelo'],
    ['Minor', 'amarelo', 'Amarelo'],
    ['Unknown', 'amarelo', 'Amarelo'],
  ])('%s vira %s', (gravidade, cor, rotulo) => {
    expect(nivelOficial(gravidade)).toEqual(expect.objectContaining({ cor, rotulo }));
  });

  // O texto do evento é o da Defesa Civil; só a caixa alta vira normal.
  it('eventoLegivel', () => {
    expect(eventoLegivel('CHUVAS INTENSAS')).toBe('Chuvas intensas');
    expect(eventoLegivel('TEMPESTADE LOCAL/CONVECTIVA - GRANIZO')).toBe('Tempestade local/convectiva - granizo');
    expect(eventoLegivel('')).toBe('');
  });

  it('emissorCurto e emissorLegivel', () => {
    expect(emissorCurto('Defesa Civil Estadual De São Paulo')).toBe('Defesa Civil de SP');
    expect(emissorCurto('Defesa Civil Estadual de Santa Catarina')).toBe('Defesa Civil de SC');
    expect(emissorCurto('Defesa Civil de Frutal (MG)')).toBe('Defesa Civil de Frutal (MG)');
    expect(emissorCurto('Defesa Civil Nacional')).toBe('Defesa Civil Nacional');
    expect(emissorLegivel('Defesa Civil Estadual De São Paulo')).toBe('Defesa Civil Estadual de São Paulo');
  });

  it('porGravidade põe o mais grave primeiro e, empatado, o mais recente', () => {
    const lista = [alerta('Moderate'), alerta('Extreme'), alerta('Severe', '2026-11-18T16:00:00Z', 'a'), alerta('Severe', '2026-11-18T18:00:00Z', 'b')];
    expect(porGravidade(lista).map((a) => a.identificador)).toEqual(['Extreme', 'b', 'a', 'Moderate']);
  });

  // Sino: uma linha por área com alerta oficial (o mais grave dela), as acompanhadas primeiro.
  it('alertasDoSinoOficial', () => {
    const area = (id: string, alertas: AlertaOficial[]) => ({ id, nome: id, alertasOficiais: alertas }) as unknown as Area;
    const linhas = alertasDoSinoOficial(
      [area('Mooca', [alerta('Moderate')]), area('Sé', [alerta('Severe'), alerta('Extreme')]), area('Lapa', []), area('Penha', [alerta('Severe')])],
      ['Penha'],
    );
    expect(linhas.map((l) => [l.area.nome, l.alerta.gravidade])).toEqual([['Penha', 'Severe'], ['Sé', 'Extreme'], ['Mooca', 'Moderate']]);
  });
});
