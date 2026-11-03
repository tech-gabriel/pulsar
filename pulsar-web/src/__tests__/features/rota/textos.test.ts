import { describe, it, expect } from 'vitest';
import { textoVeredito, rotuloHora } from '../../../features/rota/textos';
import type { RotaAvaliacao } from '../../../features/rota/tipos';

const SP = 'America/Sao_Paulo';
const base: RotaAvaliacao = { estado: 'PodeIr', trechoDecisivoId: null, tranquiloAteUtc: null, esperarAteUtc: null, trechos: [], horas: [] };
const mooca = { subprefeituraId: 'm', nome: 'Mooca', faixa: 'ALTO' as const, alagandoCge: false };

describe('textos do veredito', () => {
  it('rotuloHora respeita o fuso', () => {
    expect(rotuloHora('2026-11-03T21:00:00Z', SP)).toBe('18h');
  });

  it('PodeIr com e sem horário', () => {
    expect(textoVeredito({ ...base, tranquiloAteUtc: '2026-11-03T21:00:00Z' }, SP)).toEqual({
      titulo: 'Pode ir: caminho tranquilo', detalhe: 'Sem chuva forte prevista no trajeto até umas 18h.' });
    expect(textoVeredito(base, SP).detalhe).toBe('Sem chuva forte prevista no trajeto agora.');
  });

  it('ComAtencao com hora que volta a BAIXO e sem ela', () => {
    const r: RotaAvaliacao = { ...base, estado: 'ComAtencao', trechoDecisivoId: 'm', trechos: [mooca],
      horas: [{ inicioUtc: '2026-11-03T19:00:00Z', piorFaixa: 'MODERADO' }, { inicioUtc: '2026-11-03T20:00:00Z', piorFaixa: 'BAIXO' }] };
    expect(textoVeredito(r, SP)).toEqual({ titulo: 'Pode ir, com atenção', detalhe: 'Fique de olho na Mooca até umas 17h.' });
    expect(textoVeredito({ ...r, horas: [] }, SP).detalhe).toBe('Fique de olho na Mooca.');
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
