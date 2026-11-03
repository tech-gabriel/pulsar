import { useEffect, useState } from 'react';
import { Marker, useMap } from 'react-map-gl/maplibre';
import type { SubprefeituraMapaDto } from '../../types';
import { estiloCamada, type Camada } from '../../utils/camadas';
import { nomeAbreviado } from '../../utils/nomesSub';
import { fundoParaTextoBranco, opaca } from '../../utils/contraste';
import { normalizarNome } from '../../utils/texto';
import { tamanhoParaZoom } from './zoom';

interface Props {
  subprefeituras: SubprefeituraMapaDto[];
  subSelecionada: SubprefeituraMapaDto | null;
  camadaAtiva: Camada;
  zonaEmFoco: string | null;
  /** Modo foco: oculta os números de score (ex.: quando o overlay de alagamentos está ligado). */
  atenuado?: boolean;
  /** Ids que não mostram o número (modo rota: a subprefeitura de saída e a de chegada). */
  ocultos?: Set<string>;
}

// Glow do círculo: a cor da faixa com alpha ~0.5.
function glowDaCor(cor: string): string {
  return cor.replace(/[\d.]+\)$/, '0.5)');
}

// Legibilidade do número: o círculo é opaco e o fundo é fechado até o branco passar em 4,5:1
// (ver utils/contraste). O preenchimento translúcido fica no polígono.
export default function ScoreLabel({ subprefeituras, subSelecionada, camadaAtiva, zonaEmFoco, atenuado = false, ocultos }: Props) {
  const { current: mapRef } = useMap();
  const [zoom, setZoom] = useState(() => mapRef?.getZoom() ?? 0);

  useEffect(() => {
    const mapa = mapRef?.getMap();
    if (!mapa) return;
    const atualizar = () => setZoom(mapa.getZoom());
    mapa.on('zoomend', atualizar);
    return () => {
      mapa.off('zoomend', atualizar);
    };
  }, [mapRef]);

  if (atenuado) return null;
  const tamanho = tamanhoParaZoom(zoom);
  if (!tamanho) return null;

  const { diametro, fonte, nomeFonte } = tamanho;
  const zona = zonaEmFoco ? normalizarNome(zonaEmFoco) : null;

  return (
    <>
      {subprefeituras.filter((sub) => !ocultos?.has(sub.id)).map((sub) => {
        const estilo = estiloCamada(sub, camadaAtiva);
        const esmaecida = zona != null && normalizarNome(sub.zona) !== zona;
        const classes = ['pulsar-score-circle', estilo.pulsa ? 'pulsa' : '', subSelecionada?.id === sub.id ? 'selecionado' : '']
          .filter(Boolean)
          .join(' ');
        return (
          // key com a camada: remonta ao trocar de camada e dispara o fade. Sem ponteiro: o toque cai no polígono.
          <Marker
            key={`${sub.id}-${camadaAtiva}`}
            longitude={sub.longitude}
            latitude={sub.latitude}
            anchor="top"
            offset={[0, -diametro / 2]}
            style={{ pointerEvents: 'none' }}
          >
            <div className="pulsar-label-wrap" style={{ opacity: esmaecida ? 0.2 : 1 }}>
              <div
                className={classes}
                style={{
                  width: diametro,
                  height: diametro,
                  fontSize: fonte,
                  background: fundoParaTextoBranco(opaca(estilo.corCirculo)),
                  color: '#FFFFFF',
                  boxShadow: `0 0 10px ${glowDaCor(estilo.corCirculo)}`,
                }}
              >
                {estilo.texto}
              </div>
              {nomeFonte > 0 && (
                <div className="pulsar-sub-nome" style={{ fontSize: nomeFonte }}>
                  {nomeAbreviado(sub.nome)}
                </div>
              )}
            </div>
          </Marker>
        );
      })}
    </>
  );
}
