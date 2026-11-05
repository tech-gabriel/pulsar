import { useEffect, useMemo, useState } from 'react';
import Map, { Layer, Marker, Source } from 'react-map-gl/maplibre';
import type { StyleSpecification } from 'maplibre-gl';
import type { Feature, FeatureCollection, Polygon } from 'geojson';
import maplibregl from '../../components/mapa/maplibre';
import { estiloBaseCompartilhado } from '../../components/mapa/estiloBase';
import { circuloGeojson } from '../../components/mapa/geometria';
import { useTheme } from '../../hooks/useTheme';
import { PALETA } from '../../utils/paleta';
import { normalizarNome } from '../../utils/texto';
import type { Ponto } from './regras';


interface Props {
  pontos: Ponto[];
  /** Localização da pessoa: desenha o raio de 2 km e o "você". */
  centro?: { lat: number; lon: number };
  /** Sem localização (escolha por bairro): enquadra a subprefeitura pelo contorno leve. */
  nomeSubprefeitura: string;
  contorno: FeatureCollection | null;
}

/**
 * Mapa pequeno da página pública, no mesmo estilo do mapa do app. Carrega sob demanda (chunk
 * próprio, só depois da escolha), por isso a página e o Google não pagam por ele.
 * Gestos cooperativos: no celular a página rola com um dedo e o mapa mexe com dois.
 */
export default function MapaPerto({ pontos, centro, nomeSubprefeitura, contorno }: Props) {
  const { theme } = useTheme();
  const [estilo, setEstilo] = useState<StyleSpecification | null>(null);
  useEffect(() => {
    let valendo = true;
    estiloBaseCompartilhado(theme).then((e) => valendo && setEstilo(e)).catch(() => {});
    return () => {
      valendo = false;
    };
  }, [theme]);

  const poligono = useMemo(
    () => (contorno?.features ?? []).find((f) => normalizarNome(String(f.properties?.nm_subprefeitura ?? '')) === normalizarNome(nomeSubprefeitura)) as Feature<Polygon> | undefined,
    [contorno, nomeSubprefeitura],
  );
  const limites = useMemo(() => {
    const anel = (centro ? circuloGeojson(centro.lat, centro.lon, 2600) : poligono)?.geometry.coordinates[0];
    if (!anel) return null;
    const lons = anel.map((c) => c[0]);
    const lats = anel.map((c) => c[1]);
    return [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]] as [[number, number], [number, number]];
  }, [centro, poligono]);
  const dados = useMemo<FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: pontos.map((p) => ({ type: 'Feature', properties: { tipo: p.tipo }, geometry: { type: 'Point', coordinates: [p.lon, p.lat] } })),
  }), [pontos]);
  const raio = useMemo(() => (centro ? circuloGeojson(centro.lat, centro.lon, 2000) : null), [centro]);

  if (!estilo || !limites) return <div className="mapa-perto" aria-hidden="true" />;

  return (
    <div className="mapa-perto">
      <Map
        mapLib={maplibregl}
        mapStyle={estilo}
        initialViewState={{ bounds: limites, fitBoundsOptions: { padding: 16 } }}
        cooperativeGestures
        attributionControl={{ compact: true }}
        style={{ width: '100%', height: '100%' }}
        // A atribuição compacta nasce aberta e só recolhe no primeiro arrasto; num mapa de 280 px ela cobriria o pé.
        onLoad={(e) => e.target.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show')}
      >
        {poligono && !centro && (
          <Source id="perto-sub" type="geojson" data={poligono}>
            <Layer id="perto-sub-linha" type="line" paint={{ 'line-color': PALETA.azul, 'line-width': 2 }} />
          </Source>
        )}
        {raio && (
          <Source id="perto-raio" type="geojson" data={raio}>
            <Layer id="perto-raio-fill" type="fill" paint={{ 'fill-color': PALETA.voce, 'fill-opacity': 0.08 }} />
            <Layer id="perto-raio-linha" type="line" paint={{ 'line-color': PALETA.voce, 'line-width': 1.4, 'line-dasharray': [2, 2] }} />
          </Source>
        )}
        <Source id="perto-pontos" type="geojson" data={dados}>
          <Layer
            id="perto-pontos"
            type="circle"
            paint={{
              'circle-color': ['match', ['get', 'tipo'], 'INUNDACAO', PALETA.azulProfundo, PALETA.azul],
              'circle-radius': 5,
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 1.5,
            }}
          />
        </Source>
        {centro && (
          <Marker longitude={centro.lon} latitude={centro.lat} anchor="center">
            <span className="mapa-perto-voce" aria-label="Você" />
          </Marker>
        )}
      </Map>
    </div>
  );
}
