import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import snapshot from '../../data/baixada-snapshot.json';
import { slugify } from '../../data/regioes-seo';
// @ts-expect-error script .mjs sem tipos
import { montar, mudou } from '../../../scripts/gerar-snapshot-baixada.mjs';

const ponto = (nome: string, municipio: string, data: string) => ({ nome, municipio, data, fonte: `https://exemplo.com.br/${nome}`, lat: -23.9, lon: -46.3 });
const HOJE = new Date('2026-11-27T12:00:00Z');

describe('gerar-snapshot-baixada: montar', () => {
  it('conta os trechos e os de risco (fator > 1) por município', () => {
    const grade = { celulas: [{ sub: 'São Vicente', fator: 1.4 }, { sub: 'São Vicente', fator: 1 }, { sub: 'Santos', fator: 0.8 }] };
    const out = montar(grade, [], HOJE);
    expect(out.geradoEm).toBe('2026-11-27');
    expect(out.municipios['sao-vicente']).toEqual({ trechos: 2, trechosRisco: 1, pontos: [] });
    expect(out.municipios.santos).toEqual({ trechos: 1, trechosRisco: 0, pontos: [] });
  });

  it('guarda nome, data, fonte, lat e lon de cada ponto, do mais recente ao mais antigo', () => {
    const out = montar({ celulas: [] }, [ponto('Antigo', 'Guarujá', '2025-01-02'), ponto('Novo', 'Guarujá', '2025-08-06')], HOJE);
    expect(out.municipios.guaruja.pontos).toEqual([
      { nome: 'Novo', data: '2025-08-06', fonte: 'https://exemplo.com.br/Novo', lat: -23.9, lon: -46.3 },
      { nome: 'Antigo', data: '2025-01-02', fonte: 'https://exemplo.com.br/Antigo', lat: -23.9, lon: -46.3 },
    ]);
  });
});

describe('gerar-snapshot-baixada: mudou', () => {
  const grade = { celulas: [{ sub: 'Santos', fator: 1.2 }] };
  const base = montar(grade, [ponto('Tetéu', 'Santos', '2025-01-29')], new Date('2026-11-01T00:00:00Z'));

  it('mesmos municípios em outro dia não mudam (o geradoEm não conta)', () => {
    expect(mudou(base, montar(grade, [ponto('Tetéu', 'Santos', '2025-01-29')], HOJE))).toBe(false);
  });

  it('ponto novo ou trecho novo mudam', () => {
    expect(mudou(base, montar(grade, [ponto('Tetéu', 'Santos', '2025-01-29'), ponto('Gonzaga', 'Santos', '2025-02-01')], HOJE))).toBe(true);
    expect(mudou(base, montar({ celulas: [...grade.celulas, { sub: 'Santos', fator: 1 }] }, [ponto('Tetéu', 'Santos', '2025-01-29')], HOJE))).toBe(true);
  });

  it('sem snapshot anterior sempre muda', () => {
    expect(mudou(null, base)).toBe(true);
  });
});

describe('baixada-snapshot.json x public/pontos-criticos-baixada.json', () => {
  type P = { nome: string; data: string; fonte: string; lat: number; lon: number };
  const chave = (p: P) => JSON.stringify([p.nome, p.data, p.fonte, p.lat, p.lon]);
  const publico: (P & { municipio: string })[] = JSON.parse(readFileSync(join(__dirname, '../../../public/pontos-criticos-baixada.json'), 'utf8'));

  it('têm os mesmos pontos por município (mudou o JSON, rode npm run snapshot:baixada)', () => {
    const doJson: Record<string, string[]> = {};
    for (const p of publico) (doJson[slugify(p.municipio)] ??= []).push(chave(p));
    const doSnapshot = Object.fromEntries(
      Object.entries(snapshot.municipios as Record<string, { pontos: P[] }>)
        .filter(([, m]) => m.pontos.length > 0)
        .map(([slug, m]) => [slug, m.pontos.map(chave).sort()]),
    );
    expect(doSnapshot).toEqual(Object.fromEntries(Object.entries(doJson).map(([slug, ps]) => [slug, ps.sort()])));
  });
});
