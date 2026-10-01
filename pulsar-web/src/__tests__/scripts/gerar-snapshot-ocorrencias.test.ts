import { describe, it, expect } from 'vitest';
import { subprefeituras } from '../../data/regioes-seo';
// @ts-expect-error script .mjs sem tipos
import { agregar } from '../../../scripts/gerar-snapshot-ocorrencias.mjs';

const f = (nm: string | null, dt: string) => ({ properties: { nm_subprefeitura: nm, dt_ocorrencia: dt } });

describe('gerar-snapshot-ocorrencias: agregar', () => {
  it('casa pela sigla, ignorando grafia antiga e caixa', () => {
    const r = agregar([
      f('MP - SAO MIGUEL PAULISTA', '2026-03-02Z'),
      f('MP - Sao Miguel Paulista', '2026-03-20Z'),
      f('MP - SAO MIGUEL PAULISTA', '2026-05-01Z'),
      f('AF - Aricanduva/Vila Formosa', '2026-01-10Z'),
    ]);
    expect(r.subprefeituras['sao-miguel']).toEqual({ total: 3, mesPico: '2026-03', ultima: '2026-05-01' });
    expect(r.subprefeituras['aricanduva-formosa-carrao'].total).toBe(1);
    expect(r.periodo).toEqual({ de: '2026-01-10', ate: '2026-05-01' });
  });

  it('inclui as 32 subprefeituras (mesmos slugs do regioes-seo.ts), mesmo sem ocorrência', () => {
    const r = agregar([]);
    expect(Object.keys(r.subprefeituras).sort()).toEqual(subprefeituras.map((s) => s.slug).sort());
    expect(r.subprefeituras.lapa).toEqual({ total: 0, mesPico: null, ultima: null });
  });

  it('falha alto com sigla desconhecida (não perde dado em silêncio)', () => {
    expect(() => agregar([f('XX - NOVA SUB', '2026-01-01Z')])).toThrow(/XX - NOVA SUB/);
  });
});
