import { describe, it, expect } from 'vitest';
import { textoVeredito, rotuloHora } from '../../../features/rota/textos';
import type { RotaAvaliacao } from '../../../features/rota/tipos';

const SP = 'America/Sao_Paulo';
const base: RotaAvaliacao = { estado: 'PodeIr', trechoDecisivoId: null, esperarAteUtc: null, trechos: [], horas: [] };
const mooca = { subprefeituraId: 'm', nome: 'Mooca', faixa: 'ALTO' as const, alagandoCge: false };

describe('textos do veredito', () => {
  it('rotuloHora respeita o fuso', () => {
    expect(rotuloHora('2026-11-03T21:00:00Z', SP)).toBe('18h');
  });

  it('PodeIr fala da chuva medida, sem hora prevista', () => {
    expect(textoVeredito(base, SP)).toEqual({ titulo: 'Pode ir: caminho tranquilo', detalhe: 'Sem chuva forte medida no caminho agora.' });
  });

  it('ComAtencao sem hora prevista', () => {
    const r: RotaAvaliacao = { ...base, estado: 'ComAtencao', trechoDecisivoId: 'm', trechos: [mooca],
      horas: [{ inicioUtc: '2026-11-03T19:00:00Z', piorFaixa: 'MODERADO' }, { inicioUtc: '2026-11-03T20:00:00Z', piorFaixa: 'BAIXO' }] };
    // A previsão não entra no "com atenção": mesmo com horas, a frase não cita hora.
    expect(textoVeredito(r, SP)).toEqual({ titulo: 'Pode ir, com atenção', detalhe: 'Está chovendo na Mooca. Fique de olho.' });
  });

  it('Esperar com horário, sem horário e com CGE', () => {
    const r: RotaAvaliacao = { ...base, estado: 'Esperar', trechoDecisivoId: 'm', trechos: [mooca], esperarAteUtc: '2026-11-03T21:00:00Z' };
    expect(textoVeredito(r, SP)).toEqual({ titulo: 'Melhor esperar até umas 18h', detalhe: 'Risco alto na Mooca.' });
    expect(textoVeredito({ ...r, esperarAteUtc: null }, SP)).toEqual({
      titulo: 'Melhor esperar', detalhe: 'Risco alto na Mooca. Ainda não dá para saber quando melhora.' });
    expect(textoVeredito({ ...r, trechos: [{ ...mooca, alagandoCge: true }] }, SP).detalhe).toBe('Alagando agora na Mooca, segundo o CGE.');
  });

  it('SemDado; sem decisivo usa o pior trecho', () => {
    const r: RotaAvaliacao = { ...base, estado: 'SemDado', trechos: [{ ...mooca, faixa: null }] };
    expect(textoVeredito(r, SP)).toEqual({ titulo: 'Sem leitura recente no caminho', detalhe: 'Não temos dado recente na Mooca. Confira antes de sair.' });
    const baixo = { ...mooca, subprefeituraId: 'x', nome: 'Lapa', faixa: 'BAIXO' as const };
    expect(textoVeredito({ ...base, estado: 'Esperar', trechos: [baixo, mooca] }, SP).detalhe).toContain('Mooca');
  });
});

describe('CGE só vale no trecho decisivo', () => {
  it('CGE em outro trecho não muda o texto do decisivo', () => {
    const r: RotaAvaliacao = { ...base, estado: 'Esperar', trechoDecisivoId: 'm', esperarAteUtc: '2026-11-03T21:00:00Z',
      trechos: [mooca, { subprefeituraId: 'l', nome: 'Lapa', faixa: 'ALTO', alagandoCge: true }] };
    expect(textoVeredito(r, SP).detalhe).toBe('Risco alto na Mooca.');
  });
  it('sem decisivo, o pior trecho com CGE não ativa a frase do CGE', () => {
    const r: RotaAvaliacao = { ...base, estado: 'Esperar', trechos: [{ ...mooca, alagandoCge: true }] };
    expect(textoVeredito(r, SP).detalhe).toContain('Risco alto');
  });
});
