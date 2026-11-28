import type { Feature, FeatureCollection, Point } from 'geojson';
import type { SubprefeituraMapaDto } from '../../types';
import { PALETA } from '../../utils/paleta';
import { nomeAbreviado } from '../../utils/nomesSub';
import { normalizarNome } from '../../utils/texto';
import { corDoAnel, nivelDaArea, type CamadaMapa } from './nivel';

export interface PropsPulsar {
  id: string;
  cor: string;
  anel: string;
  nota: string;
  nome: string;
  fav: boolean;
  /** Atencao ou alerta sem etiqueta: pulsar colorido com a nota sempre visivel. */
  risco: boolean;
  esmaecida: boolean;
  /** Bola clara (amarelo): a nota usa texto escuro. */
  notaEscura: boolean;
  /** 0 sem dado/tranquilo, 1 atencao, 2 alerta: manda no tamanho do pulsar. */
  nivel: number;
}

const AMARELOS = ['#F2C200', PALETA.amarelo.toUpperCase()];
const NIVEL = { semDado: 0, tranquilo: 0, atencao: 1, alerta: 2 } as const;

/** Um ponto por area, exceto as que ja mostram etiqueta. */
export function pulsaresGeojson(
  areas: SubprefeituraMapaDto[],
  camada: CamadaMapa,
  opcoes: { favoritas: Set<string>; comEtiqueta: Set<string>; ocultos: Set<string>; zonaEmFoco: string | null },
): FeatureCollection<Point, PropsPulsar> {
  const zona = opcoes.zonaEmFoco ? normalizarNome(opcoes.zonaEmFoco) : null;
  const features: Feature<Point, PropsPulsar>[] = [];
  for (const a of areas) {
    if (opcoes.comEtiqueta.has(a.id)) continue;
    const n = nivelDaArea(a, camada);
    const oculta = opcoes.ocultos.has(a.id);
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [a.longitude, a.latitude] },
      properties: {
        id: a.id,
        cor: n.cor,
        anel: corDoAnel(n.cor),
        nota: oculta ? '' : (n.valor ?? ''),
        nome: nomeAbreviado(a.nome).toUpperCase(),
        fav: opcoes.favoritas.has(a.id),
        risco: !oculta && (n.nivel === 'atencao' || n.nivel === 'alerta'),
        esmaecida: zona != null && normalizarNome(a.zona) !== zona,
        notaEscura: AMARELOS.includes(n.cor.toUpperCase()),
        nivel: NIVEL[n.nivel],
      },
    });
  }
  return { type: 'FeatureCollection', features };
}
