import { useEffect, useState } from 'react';
import { Marker, useMap } from 'react-map-gl/maplibre';
import type { SubprefeituraMapaDto } from '../../types';
import { estiloCamada, type Camada } from '../../utils/camadas';
import { nomeAbreviado } from '../../utils/nomesSub';
import { opaca } from '../../utils/contraste';
import { normalizarNome } from '../../utils/texto';
import { tamanhoParaZoom, ZOOM_TRECHOS } from './zoom';
import { labelFaixa } from '../../utils/risco';

interface Props {
  subprefeituras: SubprefeituraMapaDto[];
  subSelecionada: SubprefeituraMapaDto | null;
  camadaAtiva: Camada;
  zonaEmFoco: string | null;
  /** Modo foco: oculta os números de score (ex.: quando o overlay de alagamentos está ligado). */
  atenuado?: boolean;
  /** Ids que não mostram o número (modo rota: a subprefeitura de saída e a de chegada). */
  ocultos?: Set<string>;
  /** Teclado e leitor de tela: o número abre a área (o toque continua caindo no polígono). */
  onSelecionar?: (sub: SubprefeituraMapaDto) => void;
  /** Há trechos no mapa: de perto, na camada de risco, a bola da área sai e fica só o nome. */
  comTrechos?: boolean;
}


// Legibilidade do número: bola na cor pura da faixa e número branco com contorno escuro (index.css,
// .bola), que lê até no amarelo. O preenchimento translúcido fica no polígono.
export default function ScoreLabel({ subprefeituras, subSelecionada, camadaAtiva, zonaEmFoco, atenuado = false, ocultos, onSelecionar, comTrechos = false }: Props) {
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
  // De perto quem fala é o trecho (escolha A de 16/11/2026): a bola com o número da área por cima
  // dos hexágonos abria o trecho de baixo e confundia. A área fica a um toque no cartão do trecho.
  const soNome = comTrechos && camadaAtiva === 'score' && zoom >= ZOOM_TRECHOS.de;

  return (
    <>
      {subprefeituras.filter((sub) => !ocultos?.has(sub.id)).map((sub) => {
        const estilo = estiloCamada(sub, camadaAtiva);
        const esmaecida = zona != null && normalizarNome(sub.zona) !== zona;
        // Bola pequena em todas as camadas (escolhas de 16/11/2026): no risco, o Tranquilo um pouco
        // menor e Atenção e Alerta maiores (R2); nas outras camadas, o tamanho do meio.
        const tranquilo = camadaAtiva === 'score' && sub.faixaRisco === 'BAIXO';
        const fator = camadaAtiva !== 'score' ? 0.8 : tranquilo ? 0.69 : 0.875;
        const bola = Math.round(diametro * fator);
        const classes = ['pulsar-score-circle', 'bola', estilo.pulsa ? 'pulsa' : '', subSelecionada?.id === sub.id ? 'selecionado' : '']
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
              {!soNome && <div
                className={classes}
                role={onSelecionar ? 'button' : undefined}
                tabIndex={onSelecionar ? 0 : undefined}
                aria-label={camadaAtiva === 'score' && sub.faixaRisco
                  ? `${sub.nome}: risco ${estilo.texto}, ${labelFaixa(sub.faixaRisco)}`
                  : `${sub.nome}: ${estilo.texto}`}
                onKeyDown={onSelecionar ? (e) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return;
                  e.preventDefault();
                  onSelecionar(sub);
                } : undefined}
                style={{
                  // A bola menor fica no mesmo centro: a margem devolve a diferença para o diâmetro.
                  width: bola,
                  height: bola,
                  margin: `${(diametro - bola) / 2}px 0`,
                  fontSize: tranquilo ? fonte - 1 : fonte,
                  // A cor pura da faixa; a borda (index.css, .bola) é a mesma cor mais fechada (D1).
                  '--cor': opaca(estilo.corCirculo),
                } as React.CSSProperties}
              >
                {estilo.texto}
              </div>}
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
