import { useEffect, useState } from 'react';
import { Marker, useMap } from 'react-map-gl/maplibre';
import type { SubprefeituraMapaDto } from '../../types';
import { estiloCamada, type Camada } from '../../utils/camadas';
import { nomeAbreviado } from '../../utils/nomesSub';
import { opaca } from '../../utils/contraste';
import { normalizarNome } from '../../utils/texto';
import { desvioDaBola, diametroDaBola, tamanhoParaZoom } from './zoom';
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
  /** Casa e Trabalho: pontos exatos que a bola não pode cobrir (ela se afasta, eles não). */
  pontosFixos?: { longitude: number; latitude: number }[];
}

const SEM_PONTOS: { longitude: number; latitude: number }[] = [];

// Legibilidade do número: bola na cor pura da faixa e número branco com contorno escuro (index.css,
// .bola), que lê até no amarelo. O preenchimento translúcido fica no polígono.
export default function ScoreLabel({ subprefeituras, subSelecionada, camadaAtiva, zonaEmFoco, atenuado = false, ocultos, onSelecionar, comTrechos = false, pontosFixos = SEM_PONTOS }: Props) {
  const { current: mapRef } = useMap();
  const [zoom, setZoom] = useState(() => mapRef?.getZoom() ?? 0);
  // Desvio de cada bola, em pixels, lido do mapa no fim de cada zoom: arrastar não muda a distância
  // entre a bola e o ponto, e ler a projeção no render seria impuro (mesmo jeito de MarcadoresLugares).
  const [desvios, setDesvios] = useState<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    const mapa = mapRef?.getMap();
    if (!mapa) return;
    const atualizar = () => {
      const z = mapa.getZoom();
      setZoom(z);
      const pontos = pontosFixos.map((p) => mapa.project([p.longitude, p.latitude]));
      const bolas = pontos.length === 0 ? [] : subprefeituras.flatMap((sub) => {
        const d = diametroDaBola({ zoom: z, camadaAtiva, comTrechos, atenuado, oculta: ocultos?.has(sub.id) });
        if (d == null) return [];
        const c = mapa.project([sub.longitude, sub.latitude]);
        return [{ id: sub.id, x: c.x, y: c.y, r: d / 2 }];
      });
      const novos: Record<string, { x: number; y: number }> = {};
      bolas.forEach((b, i) => {
        // As que já se mexeram contam na posição nova: duas bolas não vão para o mesmo lugar.
        const outras = bolas.filter((_, j) => j !== i).map((o) => ({ ...o, x: o.x + (novos[o.id]?.x ?? 0), y: o.y + (novos[o.id]?.y ?? 0) }));
        const d = desvioDaBola(b, pontos, outras);
        if (d.x || d.y) novos[b.id] = d;
      });
      setDesvios(novos);
    };
    const quadro = requestAnimationFrame(atualizar);
    mapa.on('zoomend', atualizar);
    return () => {
      cancelAnimationFrame(quadro);
      mapa.off('zoomend', atualizar);
    };
  }, [mapRef, subprefeituras, pontosFixos, camadaAtiva, comTrechos, atenuado, ocultos]);

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
        // De perto quem fala é o trecho (escolha A de 16/11/2026): sem bola, fica só o nome.
        const bola = diametroDaBola({ zoom, camadaAtiva, comTrechos });
        const soNome = bola == null;
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
            // Embaixo do ponto de Casa ou Trabalho, a bola se afasta (opção D, 17/11/2026).
            offset={[desvios[sub.id]?.x ?? 0, -diametro / 2 + (desvios[sub.id]?.y ?? 0)]}
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
                  fontSize: fonte,
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
