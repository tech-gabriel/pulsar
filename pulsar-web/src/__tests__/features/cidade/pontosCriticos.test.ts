import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import type { FeatureCollection } from 'geojson';
import { pontoEmPoligono } from '../../../utils/geo';
import { distanciaKm } from '../../../features/alagamentosHoje/regras';

interface PontoCritico { nome: string; municipio: string; lat: number; lon: number; fonte: string; data: string }

const ler = (arquivo: string) => JSON.parse(readFileSync(join(process.cwd(), 'public', arquivo), 'utf-8'));
const pontos = ler('pontos-criticos-baixada.json') as PontoCritico[];
const contornos = ler('baixada-santista-leve.geojson') as FeatureCollection;

// Pontos críticos da Baixada: lista curada, só visível no mapa (não pesa no número). Cada ponto
// precisa cair no próprio município: geocodificação que caiu no centro da cidade ou na vizinha
// (o "Canal do Pompeba" virou Santos em 18/11) não entra.
describe('pontos-criticos-baixada.json', () => {
  it.each(pontos.map((p) => [p.nome, p] as const))('%s cai no próprio município, com fonte e data', (_, p) => {
    expect(pontoEmPoligono(p.lat, p.lon, contornos)?.properties?.nm_subprefeitura).toBe(p.municipio);
    expect(p.fonte).toMatch(/^https:\/\//);
    expect(p.data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const data = new Date(`${p.data}T00:00:00Z`);
    expect(Number.isNaN(data.getTime())).toBe(false);
    expect(data.getTime()).toBeLessThanOrEqual(Date.now());
    expect(p.nome.trim()).not.toBe('');
  });

  it('sem dois pontos a menos de 50 m um do outro', () => {
    for (let i = 0; i < pontos.length; i++)
      for (let j = i + 1; j < pontos.length; j++)
        expect(distanciaKm(pontos[i], pontos[j]), `${pontos[i].nome} e ${pontos[j].nome}`).toBeGreaterThanOrEqual(0.05);
  });

  it('cobre ao menos 5 dos 9 municípios', () => {
    expect(new Set(pontos.map((p) => p.municipio)).size).toBeGreaterThanOrEqual(5);
  });
});
