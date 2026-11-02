import { describe, it, expect, vi, afterEach } from 'vitest';
import type { StyleSpecification } from 'maplibre-gl';
import {
  TOM_CLARO,
  recolorirEstilo,
  comChaveMapTiler,
  urlReservaMapTiler,
  carregarEstiloBase,
} from '../../../components/mapa/estiloBase';

const fixture = {
  version: 8,
  sources: {},
  layers: [
    { id: 'background', type: 'background', paint: {} },
    { id: 'water', type: 'fill', source: 's', paint: {} },
    { id: 'park', type: 'fill', source: 's', paint: {} },
    { id: 'building-3d', type: 'fill-extrusion', source: 's', paint: {} },
    { id: 'road_motorway', type: 'line', source: 's', paint: {} },
    { id: 'road_motorway_casing', type: 'line', source: 's', paint: {} },
    { id: 'road_minor', type: 'line', source: 's', paint: {} },
    { id: 'highway-name-minor', type: 'symbol', source: 's', paint: {} },
    { id: 'highway-shield', type: 'symbol', source: 's', paint: {} },
    { id: 'poi_r1', type: 'symbol', source: 's', minzoom: 15, paint: {} },
    { id: 'poi_r20', type: 'symbol', source: 's', paint: {} },
  ],
} as unknown as StyleSpecification;

const camada = (e: StyleSpecification, id: string) => e.layers.find((x) => x.id === id)! as unknown as {
  paint?: Record<string, unknown>; layout?: Record<string, unknown>; minzoom?: number;
};

describe('recolorirEstilo', () => {
  it('recolore no tom claro', () => {
    const e = recolorirEstilo(fixture, TOM_CLARO);
    expect(camada(e, 'background').paint).toMatchObject({ 'background-color': '#f6f6f4' });
    expect(camada(e, 'water').paint).toMatchObject({ 'fill-color': '#9fd3f5' });
    expect(camada(e, 'park').paint).toMatchObject({ 'fill-color': '#c9e9c0' });
    expect(camada(e, 'road_motorway').paint).toMatchObject({ 'line-color': '#fde58a' });
    expect(camada(e, 'road_motorway_casing').paint).toMatchObject({ 'line-color': '#ecc75a' });
    expect(camada(e, 'road_minor').paint).toMatchObject({ 'line-color': '#ffffff' });
    expect(camada(e, 'highway-name-minor').paint).toMatchObject({ 'text-color': '#5f6368', 'text-halo-color': '#ffffff' });
    expect(camada(e, 'highway-shield').paint?.['text-color']).toBeUndefined();
  });

  it('desliga 3D e antecipa POIs em 2 zooms', () => {
    const e = recolorirEstilo(fixture, TOM_CLARO);
    expect(camada(e, 'building-3d').layout).toMatchObject({ visibility: 'none' });
    expect(camada(e, 'poi_r1').minzoom).toBe(13);
    expect(camada(e, 'poi_r20').minzoom).toBe(12);
  });

  it('não muta a entrada', () => {
    const copia = structuredClone(fixture);
    recolorirEstilo(fixture, TOM_CLARO);
    expect(fixture).toEqual(copia);
  });
});

describe('MapTiler de reserva', () => {
  it('chave só onde falta', () => {
    expect(comChaveMapTiler('https://api.maptiler.com/maps/streets-v2/sprite', 'K')).toBe('https://api.maptiler.com/maps/streets-v2/sprite?key=K');
    expect(comChaveMapTiler('https://api.maptiler.com/x.json?key=K', 'K')).toBe('https://api.maptiler.com/x.json?key=K');
    expect(comChaveMapTiler('https://api.maptiler.com/x.json?a=1', 'K')).toBe('https://api.maptiler.com/x.json?a=1&key=K');
    expect(comChaveMapTiler('https://tiles.openfreemap.org/a.pbf', 'K')).toBe('https://tiles.openfreemap.org/a.pbf');
  });

  it('reserva por tema', () => {
    expect(urlReservaMapTiler('dark', 'K')).toBe('https://api.maptiler.com/maps/streets-v2-dark/style.json?key=K');
    expect(urlReservaMapTiler('light', 'K')).toBe('https://api.maptiler.com/maps/streets-v2/style.json?key=K');
  });
});

describe('carregarEstiloBase', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lança quando o OpenFreeMap responde erro', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 503 }));
    await expect(carregarEstiloBase('light')).rejects.toThrow();
  });

  it('devolve o estilo recolorido quando dá certo', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(fixture), { status: 200 }));
    const e = await carregarEstiloBase('light');
    expect(camada(e, 'background').paint).toMatchObject({ 'background-color': '#f6f6f4' });
  });
});
