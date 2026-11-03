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

// @ts-expect-error script .mjs sem tipos
import { acumularPontos } from '../../../scripts/gerar-snapshot-ocorrencias.mjs';

const pt = (id: string, dt: string, nm = 'MO - MOOCA', tipo = 'ALAGAMENTO', lon = -46.5999999, lat = -23.5500001) => ({
  properties: { cd_identificador: id, dt_ocorrencia: dt, nm_subprefeitura: nm, dc_tipo_ocorrencia: tipo },
  geometry: { type: 'Point', coordinates: [lon, lat] },
});

describe('gerar-snapshot-ocorrencias: acumularPontos', () => {
  it('junta anteriores e novos sem repetir o id, e o novo vence', () => {
    const anteriores = [{ id: '1', lat: -23.5, lon: -46.6, tipo: 'ALAGAMENTO', data: '2026-01-10', sub: 'mooca' }];
    const r = acumularPontos(anteriores, [pt('1', '2026-01-11Z'), pt('2', '2026-02-01Z')]);
    expect(r.pontos.map((p: { id: string }) => p.id).sort()).toEqual(['1', '2']);
    expect(r.pontos.find((p: { id: string }) => p.id === '1').data).toBe('2026-01-11');
  });

  it('descarta o que tem mais de 12 meses antes da ocorrência mais recente', () => {
    const anteriores = [
      { id: 'velho', lat: -23.5, lon: -46.6, tipo: 'ALAGAMENTO', data: '2025-02-28', sub: 'mooca' },
      { id: 'limite', lat: -23.5, lon: -46.6, tipo: 'ALAGAMENTO', data: '2025-03-01', sub: 'mooca' },
    ];
    const r = acumularPontos(anteriores, [pt('novo', '2026-03-01Z')]);
    expect(r.pontos.map((p: { id: string }) => p.id).sort()).toEqual(['limite', 'novo']);
  });

  it('arredonda para 5 casas, traduz tipo e subprefeitura e ignora sigla desconhecida', () => {
    const r = acumularPontos([], [pt('1', '2026-04-01Z', 'MO - MOOCA', 'INUNDACAO'), pt('2', '2026-04-02Z', 'XX - NADA')]);
    expect(r.pontos).toEqual([{ id: '1', lat: -23.55, lon: -46.6, tipo: 'INUNDACAO', data: '2026-04-01', sub: 'mooca' }]);
  });

  it('o período vai da menor à maior data guardada', () => {
    const r = acumularPontos([], [pt('1', '2026-01-04Z'), pt('2', '2026-08-30Z')]);
    expect(r.periodo).toEqual({ de: '2026-01-04', ate: '2026-08-30' });
  });
});

// @ts-expect-error script .mjs sem tipos
import { lerPontosAnteriores, exigirOcorrencias } from '../../../scripts/gerar-snapshot-ocorrencias.mjs';

describe('gerar-snapshot-ocorrencias: base do acúmulo e camada vazia', () => {
  const local = { pontos: [{ id: 'local' }] };
  const prod = { pontos: [{ id: 'prod' }] };

  it('usa o arquivo em produção como base (o CI não commita o acumulado)', async () => {
    const f = async () => new Response(JSON.stringify(prod), { status: 200 });
    expect(await lerPontosAnteriores(f, () => local)).toEqual(prod.pontos);
  });

  it('produção fora ou com erro: cai no arquivo do repositório', async () => {
    expect(await lerPontosAnteriores(async () => new Response('', { status: 503 }), () => local)).toEqual(local.pontos);
    expect(await lerPontosAnteriores(async () => { throw new Error('rede'); }, () => local)).toEqual(local.pontos);
    expect(await lerPontosAnteriores(async () => { throw new Error('rede'); }, () => null)).toEqual([]);
  });

  it('camada sem nenhuma ocorrência é tratada como falha (não zera o ranking em janeiro)', () => {
    expect(() => exigirOcorrencias([])).toThrow();
    expect(() => exigirOcorrencias([{}])).not.toThrow();
  });
});
