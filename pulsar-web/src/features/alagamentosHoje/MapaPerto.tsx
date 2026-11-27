import { useEffect, useMemo, useState } from 'react';
import Map, { Layer, Marker, Source } from 'react-map-gl/maplibre';
import type { StyleSpecification } from 'maplibre-gl';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import maplibregl from '../../components/mapa/maplibre';
import { estiloBaseCompartilhado } from '../../components/mapa/estiloBase';
import { circuloGeojson } from '../../components/mapa/geometria';
import { useTheme } from '../../hooks/useTheme';
import { PALETA } from '../../utils/paleta';
import { normalizarNome } from '../../utils/texto';
import type { Ponto } from './regras';

/** Anel externo do contorno; num MultiPolygon, o do maior pedaço (as ilhas ficam fora do enquadramento). */
function anelPrincipal(f: Feature<Polygon | MultiPolygon> | undefined) {
  if (!f) return undefined;
  if (f.geometry.type === 'Polygon') return f.geometry.coordinates[0];
  // ponytail: "maior" pelo número de vértices, não pela área; basta para ilha pequena ao lado do continente.
  return f.geometry.coordinates.map((p) => p[0]).reduce((a, b) => (b.length > a.length ? b : a));
}

interface Props {
  pontos: Pick<Ponto, 'lat' | 'lon' | 'tipo'>[];
  /** Localização da pessoa: desenha o raio de 2 km e o "você". */
  centro?: { lat: number; lon: number };
  /** Sem localização (escolha por bairro): enquadra a subprefeitura pelo contorno leve. */
  nomeSubprefeitura: string;
  contorno: FeatureCollection | null;
  /** Enquadra os pontos, não o contorno inteiro (município da Baixada: o contorno pega mangue e ilhas). */
  enquadrarPontos?: boolean;
}

/**
 * Mapa pequeno da página pública, no mesmo estilo do mapa do app. Carrega sob demanda (chunk
 * próprio, só depois da escolha), por isso a página e o Google não pagam por ele.
 * Gestos cooperativos: no celular a página rola com um dedo e o mapa mexe com dois.
 */
export default function MapaPerto({ pontos, centro, nomeSubprefeitura, contorno, enquadrarPontos = false }: Props) {
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
    () => (contorno?.features ?? []).find((f) => normalizarNome(String(f.properties?.nm_subprefeitura ?? '')) === normalizarNome(nomeSubprefeitura)) as Feature<Polygon | MultiPolygon> | undefined,
    [contorno, nomeSubprefeitura],
  );
  const limites = useMemo(() => {
    const anel = centro
      ? circuloGeojson(centro.lat, centro.lon, 2600).geometry.coordinates[0]
      : enquadrarPontos && pontos.length > 0
        ? pontos.map((p) => [p.lon, p.lat])
        : anelPrincipal(poligono);
    if (!anel) return null;
    const lons = anel.map((c) => c[0]);
    const lats = anel.map((c) => c[1]);
    return [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]] as [[number, number], [number, number]];
  }, [centro, poligono, enquadrarPontos, pontos]);
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
        initialViewState={{ bounds: limites, fitBoundsOptions: enquadrarPontos ? { padding: 40, maxZoom: 14 } : { padding: 16 } }}
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
