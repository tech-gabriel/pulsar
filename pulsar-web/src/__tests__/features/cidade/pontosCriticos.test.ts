import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import type { FeatureCollection } from 'geojson';
import { pontoEmPoligono } from '../../../utils/geo';
import { distanciaKm } from '../../../features/alagamentosHoje/regras';
import { pontosCriticosGeojson, textoPontoCritico } from '../../../features/cidade/pontosCriticos';

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

  // Quando o provedor só acha a cidade, ele devolve o ponto central do município: um ponto crítico
  // ali não é um lugar que alaga. Centros do MapTiler conferidos em 18/11/2026 pela busca do app
  // (Cubatão, Itanhaém e Peruíbe não voltam como município na busca).
  const CENTROS = [
    { nome: 'Santos', lat: -23.96094, lon: -46.31663 },
    { nome: 'São Vicente', lat: -23.96642, lon: -46.38614 },
    { nome: 'Guarujá', lat: -23.99278, lon: -46.25583 },
    { nome: 'Praia Grande', lat: -24.00898, lon: -46.41449 },
    { nome: 'Bertioga', lat: -23.84857, lon: -46.13959 },
    { nome: 'Mongaguá', lat: -24.09595, lon: -46.62344 },
  ];

  it('nenhum ponto no centro de um município (resultado de "só achei a cidade")', () => {
    for (const p of pontos)
      for (const c of CENTROS)
        expect(distanciaKm(p, c), `${p.nome} perto do centro de ${c.nome}`).toBeGreaterThanOrEqual(0.2);
  });

  it('cobre ao menos 5 dos 9 municípios', () => {
    expect(new Set(pontos.map((p) => p.municipio)).size).toBeGreaterThanOrEqual(5);
  });
});

// D3 (escolha do user, 18/11/2026): os pontos entram na camada da gota; o toque diz quando alagou,
// que o ponto não muda o risco da área e de onde veio.
describe('ponto crítico no mapa', () => {
  const p = { nome: 'Avenida Rangel Pestana', municipio: 'Santos', lat: -23.94271, lon: -46.33259, fonte: 'https://www.abcdoabc.com.br/fortes-chuvas', data: '2025-08-06' };

  it('o texto do toque', () => {
    expect(textoPontoCritico(p)).toEqual({ quando: 'Alagou em 6 de agosto de 2025. Não muda o risco da área.', fonte: 'abcdoabc.com.br' });
  });

  it('o ponto no mapa (GeoJSON é lon, lat)', () => {
    const g = pontosCriticosGeojson([p]);
    expect(g.features[0].geometry.coordinates).toEqual([-46.33259, -23.94271]);
    expect(g.features[0].properties).toEqual({ i: 0 });
  });
});
