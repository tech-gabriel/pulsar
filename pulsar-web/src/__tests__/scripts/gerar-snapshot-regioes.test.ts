import { describe, it, expect } from 'vitest';
import { subprefeituras, zonas } from '../../data/regioes-seo';
// @ts-expect-error script .mjs sem tipos
import { validar } from '../../../scripts/gerar-snapshot-regioes.mjs';

const est = { diasCompletos: 61, diasAlerta: 2, chuvaTotalMm: 212.4, faixaPredominante: 'BAIXO', diaMaisChuvoso: null };
const resposta = (mudar: (r: Record<string, unknown>) => void = () => {}) => {
  const r: Record<string, unknown> = {
    janelaDias: 90,
    geradoEm: '2026-10-13',
    subprefeituras: Object.fromEntries(subprefeituras.map((s) => [s.slug, s.slug === 'mooca' ? est : null])),
    zonas: Object.fromEntries(zonas.map((z) => [z.slug, null])),
  };
  mudar(r);
  return r;
};

describe('gerar-snapshot-regioes: validar', () => {
  it('aceita a resposta da API e devolve o snapshot com as mesmas chaves', () => {
    const out = validar(resposta());
    expect(out.geradoEm).toBe('2026-10-13');
    expect(out.janelaDias).toBe(90);
    expect(out.subprefeituras.mooca).toEqual(est);
    expect(Object.keys(out.zonas).sort()).toEqual(zonas.map((z) => z.slug).sort());
  });

  it('rejeita conjunto incompleto de subprefeituras (o sitemap depende das chaves)', () => {
    expect(() => validar(resposta((r) => {
      delete (r.subprefeituras as Record<string, unknown>).mooca;
    }))).toThrow(/subprefeituras: esperava 32/);
  });

  it('rejeita zonas faltando', () => {
    expect(() => validar(resposta((r) => { r.zonas = {}; }))).toThrow(/zonas: esperava 5/);
  });

  it('rejeita valor sem diasCompletos', () => {
    expect(() => validar(resposta((r) => {
      (r.subprefeituras as Record<string, unknown>).mooca = { diasAlerta: 1 };
    }))).toThrow(/mooca/);
  });

  it('rejeita o que não é a resposta esperada (HTML de erro, null, data inválida)', () => {
    expect(() => validar('<html>502</html>')).toThrow();
    expect(() => validar(null)).toThrow();
    expect(() => validar(resposta((r) => { r.geradoEm = 'ontem'; }))).toThrow(/geradoEm/);
  });
});
