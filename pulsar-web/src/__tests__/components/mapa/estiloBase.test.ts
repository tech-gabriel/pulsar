import { describe, it, expect, vi, afterEach } from 'vitest';
import type { StyleSpecification } from 'maplibre-gl';
import {
  TOM_CLARO,
  TOM_ESCURO,
  recolorirEstilo,
  comChaveMapTiler,
  urlReservaMapTiler,
  carregarEstiloBase,
  estiloBaseCompartilhado,
  aguaPorCima,
  viasCinza,
} from '../../../components/mapa/estiloBase';

const fixture = {
  version: 8,
  sources: {},
  layers: [
    { id: 'background', type: 'background', paint: {} },
    { id: 'water', type: 'fill', source: 's', paint: {} },
    { id: 'park', type: 'fill', source: 's', paint: {} },
    { id: 'building', type: 'fill', source: 's', minzoom: 13, maxzoom: 14, paint: {} },
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
  paint?: Record<string, unknown>; layout?: Record<string, unknown>; minzoom?: number; maxzoom?: number;
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

  it('prédios planos em todos os zooms de rua, com cor e contorno do tom', () => {
    for (const tom of [TOM_CLARO, TOM_ESCURO]) {
      const predio = camada(recolorirEstilo(fixture, tom), 'building');
      expect(predio.maxzoom).toBeUndefined();
      expect(predio.paint).toMatchObject({ 'fill-color': tom.predio, 'fill-outline-color': tom.predioBorda });
    }
  });

  it('desliga 3D e antecipa POIs em 2 zooms', () => {
    const e = recolorirEstilo(fixture, TOM_CLARO);
    expect(camada(e, 'building-3d').layout).toMatchObject({ visibility: 'none' });
    expect(camada(e, 'poi_r1').minzoom).toBe(13);
    expect(camada(e, 'poi_r20').minzoom).toBe(12);
  });

  it('no escuro todo rótulo (menos placas) fica claro com halo escuro', () => {
    const comLugar = {
      ...fixture,
      layers: [...fixture.layers, { id: 'label_city', type: 'symbol', source: 's', paint: { 'text-color': '#333', 'text-halo-color': '#fff' } }],
    } as unknown as StyleSpecification;
    const e = recolorirEstilo(comLugar, TOM_ESCURO);
    expect(camada(e, 'label_city').paint).toMatchObject({ 'text-color': TOM_ESCURO.textoRua, 'text-halo-color': TOM_ESCURO.haloRua });
    expect(camada(e, 'poi_r1').paint).toMatchObject({ 'text-color': TOM_ESCURO.textoRua });
    expect(camada(e, 'highway-shield').paint?.['text-color']).toBeUndefined();
  });

  it('no claro os rótulos de lugar mantêm as cores do estilo', () => {
    const comLugar = {
      ...fixture,
      layers: [...fixture.layers, { id: 'label_city', type: 'symbol', source: 's', paint: { 'text-color': '#333' } }],
    } as unknown as StyleSpecification;
    expect(camada(recolorirEstilo(comLugar, TOM_CLARO), 'label_city').paint).toMatchObject({ 'text-color': '#333' });
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

  it('estiloBaseCompartilhado busca uma vez por tema e não guarda falha', async () => {
    const espiao = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockImplementation(async () => new Response(JSON.stringify(fixture), { status: 200 }));
    await expect(estiloBaseCompartilhado('dark')).rejects.toThrow();
    const [a, b] = await Promise.all([estiloBaseCompartilhado('dark'), estiloBaseCompartilhado('dark')]);
    expect(a).toBe(b);
    expect(espiao).toHaveBeenCalledTimes(2);
  });

  it('devolve o estilo recolorido quando dá certo', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(fixture), { status: 200 }));
    const e = await carregarEstiloBase('light');
    expect(camada(e, 'background').paint).toMatchObject({ 'background-color': '#f6f6f4' });
  });
});

function mapaFalso(layers: unknown[]) {
  return {
    getStyle: vi.fn(() => ({ layers })),
    moveLayer: vi.fn(),
    setPaintProperty: vi.fn(),
  } as unknown as import('maplibre-gl').Map & { moveLayer: ReturnType<typeof vi.fn>; setPaintProperty: ReturnType<typeof vi.fn> };
}

describe('aguaPorCima', () => {
  it('move só as camadas fill de água para antes do id dado', () => {
    const m = mapaFalso([
      { id: 'water', type: 'fill' },
      { id: 'waterway', type: 'line' },
      { id: 'park', type: 'fill' },
      { id: 'pulsar-water-x', type: 'fill' },
      { id: 'label', type: 'symbol' },
    ]);
    aguaPorCima(m, 'pulsar-mancha-1');
    expect(m.moveLayer).toHaveBeenCalledTimes(1);
    expect(m.moveLayer).toHaveBeenCalledWith('water', 'pulsar-mancha-1');
  });

  it('sem id, usa o primeiro símbolo do estilo base', () => {
    const m = mapaFalso([{ id: 'water', type: 'fill' }, { id: 'pulsar-s', type: 'symbol' }, { id: 'label', type: 'symbol' }]);
    aguaPorCima(m);
    expect(m.moveLayer).toHaveBeenCalledWith('water', 'label');
  });
});

describe('viasCinza', () => {
  const layers = [
    { id: 'road_motorway', type: 'line' },
    { id: 'road_motorway_casing', type: 'line' },
    { id: 'road_trunk_primary', type: 'line' },
    { id: 'road_minor', type: 'line' },
    { id: 'pulsar-motorway', type: 'line' },
  ];

  it('pinta de cinza só as vias expressas', () => {
    const m = mapaFalso(layers);
    viasCinza(m, 'light', true);
    expect(m.setPaintProperty).toHaveBeenCalledTimes(3);
    expect(m.setPaintProperty).toHaveBeenCalledWith('road_motorway_casing', 'line-color', '#c7ccd3');
    expect(m.setPaintProperty).toHaveBeenCalledWith('road_motorway', 'line-color', '#e6e8eb');
    expect(m.setPaintProperty).toHaveBeenCalledWith('road_trunk_primary', 'line-color', '#e6e8eb');
  });

  it('desligado, devolve o amarelo do tom', () => {
    const m = mapaFalso(layers);
    viasCinza(m, 'light', false);
    expect(m.setPaintProperty).toHaveBeenCalledWith('road_motorway', 'line-color', TOM_CLARO.via);
    expect(m.setPaintProperty).toHaveBeenCalledWith('road_motorway_casing', 'line-color', TOM_CLARO.viaBorda);
  });
});
