import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMap } from 'react-map-gl/maplibre';
import { CloudRain, Thermometer, Wind } from 'lucide-react';
import { colocarEtiquetas, compacta as ehCompacta, type Caixa, type Etiqueta } from '../../features/mapa/etiquetas';

interface Props {
  etiquetas: Etiqueta[];
  /** Caixas que nenhuma etiqueta pode cobrir (Casa, Trabalho, ponto buscado), em px do mapa. */
  bloqueios: () => Caixa[];
  onAbrir: (areaId: string) => void;
  /** As que não couberam: quem chama mostra o pulsar com a nota no lugar delas. */
  onOcultas: (ocultas: Set<string>) => void;
}

const FAIXA = { atencao: 'Atenção', alerta: 'Alerta' } as const;
const PERIGO = { chuva: 'alagamento', calor: 'calor', vento: 'vento' } as const;
const ICONE = { chuva: CloudRain, calor: Thermometer, vento: Wind } as const;

const rotulo = (e: Etiqueta) => `${e.nome}: ${FAIXA[e.nivel]} de ${PERIGO[e.perigo]}. ${e.motivo}`;
const iguais = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((x) => b.has(x));

/**
 * Etiquetas das áreas em Atenção ou Alerta, em HTML por cima do mapa (são poucas). A posição
 * segue o mapa no `move` só por transform; a colisão roda no fim de cada movimento.
 */
export default function EtiquetasRisco({ etiquetas, bloqueios, onAbrir, onOcultas }: Props) {
  const { current: mapRef } = useMap();
  const mapa = mapRef?.getMap();
  const els = useRef(new Map<string, HTMLButtonElement>());
  const [zoom, setZoom] = useState(() => mapa?.getZoom() ?? 0);
  const [ocultas, setOcultas] = useState<Set<string>>(() => new Set());
  const compacta = ehCompacta(zoom);

  // Handlers registrados uma vez leem sempre a versão atual.
  const atual = useRef({ etiquetas, bloqueios, onOcultas });
  useEffect(() => {
    atual.current = { etiquetas, bloqueios, onOcultas };
  });

  useEffect(() => {
    atual.current.onOcultas(ocultas);
  }, [ocultas]);

  useEffect(() => {
    if (!mapa) return;
    // Quanto cada etiqueta saiu do centro da área para não cobrir um pino ou outra etiqueta.
    let desvios: Record<string, { x: number; y: number }> = {};
    const posicionar = () => {
      for (const e of atual.current.etiquetas) {
        const el = els.current.get(e.areaId);
        if (!el) continue;
        const p = mapa.project([e.lon, e.lat]);
        const d = desvios[e.areaId] ?? { x: 0, y: 0 };
        el.style.transform = `translate(${p.x + d.x}px, ${p.y + d.y}px) translate(-50%, -50%)`;
      }
    };
    const arrumar = () => {
      const itens = atual.current.etiquetas.flatMap((etiqueta) => {
        const el = els.current.get(etiqueta.areaId);
        if (!el) return [];
        const p = mapa.project([etiqueta.lon, etiqueta.lat]);
        const w = el.offsetWidth, h = el.offsetHeight;
        return [{ etiqueta, caixa: { x: p.x - w / 2, y: p.y - h / 2, w, h } }];
      });
      // O canvas tem o tamanho da tela do mapa; o canvasContainer não (os filhos são absolutos: 0 x 0).
      const box = mapa.getCanvas();
      // Coberta = nos cantos ou no centro, o que está por cima não é do mapa (busca, botões, convites,
      // cartão de baixo). Pinos e etiquetas moram no canvasContainer e já entram pela colisão.
      const origem = box.getBoundingClientRect();
      const camadaDoMapa = mapa.getCanvasContainer();
      const coberta = (c: Caixa) =>
        [[c.x + 2, c.y + 2], [c.x + c.w - 2, c.y + 2], [c.x + 2, c.y + c.h - 2], [c.x + c.w - 2, c.y + c.h - 2], [c.x + c.w / 2, c.y + c.h / 2]]
          .some(([x, y]) => {
            const el = document.elementFromPoint?.(origem.left + x, origem.top + y);
            return !!el && !camadaDoMapa.contains(el);
          });
      const r = colocarEtiquetas(itens, atual.current.bloqueios(), { w: box.clientWidth, h: box.clientHeight }, 4, coberta);
      desvios = r.desvios;
      posicionar();
      const fora = r.ocultas;
      const novas = new Set(fora.map((e) => e.areaId));
      setOcultas((antes) => (iguais(antes, novas) ? antes : novas));
    };
    const aoZoom = () => setZoom(mapa.getZoom());
    // Um quadro depois do render: as etiquetas já têm tamanho para a colisão.
    const quadro = requestAnimationFrame(arrumar);
    mapa.on('move', posicionar);
    mapa.on('moveend', arrumar);
    mapa.on('zoomend', aoZoom);
    return () => {
      cancelAnimationFrame(quadro);
      mapa.off('move', posicionar);
      mapa.off('moveend', arrumar);
      mapa.off('zoomend', aoZoom);
    };
  }, [mapa, etiquetas, compacta]);

  if (!mapa) return null;

  return createPortal(
    <>
      <div data-testid="etiquetas-no-mapa">
        {etiquetas.map((e) => {
          const Icone = ICONE[e.perigo];
          const oculta = ocultas.has(e.areaId);
          return (
            <button
              key={e.areaId}
              ref={(el) => {
                if (el) els.current.set(e.areaId, el);
                else els.current.delete(e.areaId);
              }}
              type="button"
              className="etiqueta-risco"
              aria-label={rotulo(e)}
              aria-hidden={oculta || undefined}
              tabIndex={oculta ? -1 : undefined}
              style={{ visibility: oculta ? 'hidden' : undefined }}
              onClick={() => onAbrir(e.areaId)}
            >
              <span className={`etiqueta-disco ${e.nivel === 'alerta' ? 'losango' : ''}`}>
                <Icone size={13} strokeWidth={2.4} aria-hidden="true" />
              </span>
              <span className="etiqueta-texto">
                <b>{e.nome} <em>{e.valor}</em></b>
                {!compacta && <small>{FAIXA[e.nivel]} · {e.motivo}</small>}
              </span>
            </button>
          );
        })}
      </div>
      <ul className="sr-only" aria-label="Áreas em risco agora">
        {etiquetas.map((e) => (
          <li key={e.areaId}>
            <button type="button" onClick={() => onAbrir(e.areaId)}>{rotulo(e)}</button>
          </li>
        ))}
      </ul>
    </>,
    mapa.getCanvasContainer(),
  );
}
