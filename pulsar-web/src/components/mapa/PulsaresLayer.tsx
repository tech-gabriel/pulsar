import { Layer, Source } from 'react-map-gl/maplibre';
import type { FeatureCollection, Point } from 'geojson';
import type { ExpressionSpecification } from 'maplibre-gl';
import type { PropsPulsar } from '../../features/mapa/pulsares';
import { useTheme } from '../../hooks/useTheme';

const DE_PERTO = 10.8;

// Raio por zoom e nivel; k escala os halos. O zoom fica no topo do interpolate.
const raio = (k: number, kPerto: number): ExpressionSpecification => [
  'interpolate', ['linear'], ['zoom'],
  8, ['match', ['get', 'nivel'], 0, 3 * k, 1, 4.5 * k, 6 * k],
  10.6, ['match', ['get', 'nivel'], 0, 4.5 * k, 1, 6 * k, 8 * k],
  DE_PERTO, 13 * kPerto,
  15, 14 * kPerto,
];
const escala = (k: number) => raio(k, 1 + (k - 1) * 0.45);

const OPACIDADE = (cheia: number): ExpressionSpecification => ['case', ['get', 'esmaecida'], 0.2, cheia];

interface Props {
  dados: FeatureCollection<Point, PropsPulsar>;
  /** Alagamentos ligados: some a nota e o nome. */
  atenuado: boolean;
  idPrimeiroSimbolo?: string;
}

/** O pulsar da marca por area (nucleo e dois halos de 26% e 14%), em camadas WebGL no lugar das bolas HTML. */
export default function PulsaresLayer({ dados, atenuado, idPrimeiroSimbolo }: Props) {
  const escuro = useTheme().theme === 'dark';
  const base = { beforeId: idPrimeiroSimbolo } as const;
  return (
    <Source id="pulsar-pulsar" type="geojson" data={dados}>
      <Layer {...base} id="pulsar-pulsar-h2" type="circle"
        paint={{ 'circle-color': ['get', 'cor'], 'circle-opacity': OPACIDADE(0.14), 'circle-radius': escala(2) }} />
      <Layer {...base} id="pulsar-pulsar-h1" type="circle"
        paint={{ 'circle-color': ['get', 'cor'], 'circle-opacity': OPACIDADE(0.26), 'circle-radius': escala(1.55) }} />
      <Layer {...base} id="pulsar-pulsar-nucleo" type="circle"
        paint={{
          'circle-color': ['get', 'cor'],
          'circle-opacity': OPACIDADE(1),
          'circle-radius': raio(1, 1),
          'circle-stroke-color': ['get', 'anel'],
          'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 10.4, 0, 10.8, ['case', ['get', 'fav'], 2, 0]],
          'circle-stroke-opacity': OPACIDADE(0.85),
        }} />
      {!atenuado && (
        <Layer {...base} id="pulsar-pulsar-nota" type="symbol"
          filter={['!=', ['get', 'nota'], '']}
          layout={{ 'text-field': ['get', 'nota'], 'text-font': ['Noto Sans Bold'], 'text-size': 11, 'text-allow-overlap': true }}
          paint={{
            'text-color': ['case', ['get', 'notaEscura'], '#3a2e00', '#ffffff'],
            'text-halo-color': ['case', ['get', 'notaEscura'], 'rgba(0,0,0,0)', 'rgba(0,0,0,.55)'],
            'text-halo-width': 0.8,
            // Longe so as areas em risco mostram a nota; a partir de z10.8 todas. O zoom fica no topo do interpolate.
            'text-opacity': ['interpolate', ['linear'], ['zoom'], 10.7, ['case', ['get', 'esmaecida'], 0.2, ['get', 'risco'], 1, 0], DE_PERTO, ['case', ['get', 'esmaecida'], 0.2, 1]],
          }} />
      )}
      {!atenuado && (
        <Layer {...base} id="pulsar-pulsar-nome" type="symbol" minzoom={10.3}
          layout={{
            'text-field': ['get', 'nome'], 'text-font': ['Noto Sans Bold'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 10.3, 9.5, 13, 11.5],
            'text-letter-spacing': 0.08, 'text-offset': [0, 1.9], 'text-anchor': 'top', 'text-max-width': 9,
          }}
          paint={{ 'text-color': escuro ? '#B8D4EA' : '#3B4B63', 'text-halo-color': escuro ? 'rgba(5,47,74,.9)' : 'rgba(255,255,255,.95)', 'text-halo-width': 1.4, 'text-opacity': OPACIDADE(1) }} />
      )}
    </Source>
  );
}
