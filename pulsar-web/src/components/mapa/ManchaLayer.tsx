import { Layer, Source } from 'react-map-gl/maplibre';
import type { FeatureCollection, Point } from 'geojson';
import type { ExpressionSpecification } from 'maplibre-gl';
import type { PropsMancha } from '../../features/mapa/mancha';
import type { CamadaMapa } from '../../features/mapa/nivel';
import { PALETA, comAlfa } from '../../utils/paleta';

// O zoom fica no topo do interpolate (aninhado num '*' a camada é recusada sem aviso): a escala
// entra multiplicando cada parada.
const raio = (k = 1): ExpressionSpecification => [
  'interpolate', ['exponential', 2], ['zoom'],
  ...[8, 7, 9, 11, 10, 18, 11, 32, 12, 66, 13, 136, 14, 270, 16, 1080].map((v, i) => (i % 2 ? v * k : v)),
] as ExpressionSpecification;
const RAIO = raio();
// Temperatura (6B, 28/11): o verde espalha menos, para não passar por baixo das áreas em Atenção e
// Alerta (vermelho translúcido sobre verde virava uma borda marrom).
const RAIO_VERDE_TEMPERATURA = raio(0.6);
const INTENSIDADE: ExpressionSpecification = ['interpolate', ['linear'], ['zoom'], 8, 2.4, 10, 2, 11, 1.6, 12, 1.15, 14, 0.9];
const OPACIDADE_RISCO: ExpressionSpecification = ['interpolate', ['linear'], ['zoom'], 9, 1, 11, 0.9, 13, 0.6, 15, 0.45];

interface Banda { banda: number; cor: string; teto: number }

// Cor fixa por banda; a densidade só manda no alfa. Tranquilo, Atenção e Alerta do semáforo.
const SEMAFORO = [PALETA.verde, PALETA.riscoAmarelo, PALETA.riscoVermelho];
// Mesmas cores de faixaVento (utils/camadas.ts).
const VENTO = [PALETA.neutro, PALETA.amarelo, PALETA.ambar, PALETA.vermelho];

const BANDAS: Record<Exclude<CamadaMapa, 'chuva'>, Banda[]> = {
  score: [1, 2].map((banda) => ({ banda, cor: SEMAFORO[banda], teto: 0.44 })),
  temperatura: [0.3, 0.5, 0.5].map((teto, banda) => ({ banda, cor: SEMAFORO[banda], teto })),
  vento: [0.26, 0.46, 0.5, 0.52].map((teto, banda) => ({ banda, cor: VENTO[banda], teto })),
};

// Tema escuro (4B, 28/11): sobre o fundo marinho o vermelho virava vinho e o amarelo, oliva. No
// escuro a mancha usa o tom mais luminoso de cada cor (os 400 do Tailwind).
const NO_ESCURO: Record<string, string> = {
  [PALETA.riscoAmarelo]: '#FACC15',
  [PALETA.riscoVermelho]: '#F87171',
  [PALETA.verde]: '#4ADE80',
  [PALETA.amarelo]: '#FACC15',
  [PALETA.ambar]: '#FBBF24',
  [PALETA.vermelho]: '#F87171',
};

const rampa = (cor: string, teto: number): ExpressionSpecification => [
  'interpolate', ['linear'], ['heatmap-density'],
  0, comAlfa(cor, 0), 0.12, comAlfa(cor, 0), 0.3, comAlfa(cor, teto * 0.8), 0.5, comAlfa(cor, teto), 1, comAlfa(cor, teto),
];

// Rampa azul do radar de chuva (peso pelos mm).
const RAMPA_CHUVA: ExpressionSpecification = [
  'interpolate', ['linear'], ['heatmap-density'],
  0, 'rgba(59,130,246,0)', 0.1, 'rgba(96,165,250,.18)', 0.4, 'rgba(59,130,246,.34)', 0.75, 'rgba(37,99,235,.48)', 1, 'rgba(30,64,175,.58)',
];

interface Props {
  camada: CamadaMapa;
  pontos: FeatureCollection<Point, PropsMancha>;
  idPrimeiroSimbolo: string | undefined;
  escuro?: boolean;
}

/**
 * Risco como mancha suave (heatmap) em vez de região pintada: uma camada por banda de cor, e a
 * densidade só controla a transparência. Na Chuva, uma camada só, ponderada pelos mm.
 */
export default function ManchaLayer({ camada, pontos, idPrimeiroSimbolo, escuro = false }: Props) {
  return (
    <Source id="pulsar-mancha" type="geojson" data={pontos}>
      {camada === 'chuva' ? (
        <Layer
          id="pulsar-mancha-chuva"
          type="heatmap"
          beforeId={idPrimeiroSimbolo}
          paint={{
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'mm'], 0, 0, 25, 0.45],
            'heatmap-radius': RAIO,
            'heatmap-intensity': INTENSIDADE,
            'heatmap-color': RAMPA_CHUVA,
          }}
        />
      ) : (
        BANDAS[camada].map(({ banda, cor, teto }) => (
          <Layer
            key={banda}
            id={`pulsar-mancha-${banda}`}
            type="heatmap"
            beforeId={idPrimeiroSimbolo}
            filter={['==', ['get', 'banda'], banda]}
            paint={{
              'heatmap-weight': 1,
              'heatmap-radius': camada === 'temperatura' && banda === 0 ? RAIO_VERDE_TEMPERATURA : RAIO,
              'heatmap-intensity': INTENSIDADE,
              'heatmap-color': rampa(escuro ? (NO_ESCURO[cor] ?? cor) : cor, teto),
              'heatmap-opacity': camada === 'score' ? OPACIDADE_RISCO : 1,
            }}
          />
        ))
      )}
    </Source>
  );
}
