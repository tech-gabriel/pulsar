import { useEffect, useState } from 'react';
import { Marker, useMap } from 'react-map-gl/maplibre';
import { BriefcaseBusiness, House, TriangleAlert } from 'lucide-react';
import type { LocalSalvoDto, TipoLocal } from '../../types';
import { ROTULO_TIPO } from '../../features/locais/regras';
import { modoDoMarcador, posicaoDaEtiqueta } from '../../features/locais/estadoLugar';
import { tamanhoParaZoom } from './zoom';

interface Props {
  lugares: LocalSalvoDto[];
  onTocar: (tipo: TipoLocal) => void;
  /** Com alagamento ativo na região: anel de alerta antes de qualquer toque. */
  emAlerta?: TipoLocal[];
  /** Onde fica o círculo de score de cada subprefeitura (o centro dela), para a etiqueta não cobri-lo. */
  areas?: { id: string; longitude: number; latitude: number }[];
}

/**
 * Casa e trabalho no mapa (F4b, opção D). Na vista da cidade, um ponto de 24 px menor que os
 * círculos de score; de perto, a etiqueta com o nome, presa ao ponto exato por uma haste e aberta
 * para o lado oposto ao círculo da região (F4b-P1, opção A).
 * Só o mapa do app desenha isto: o card de compartilhar recebe outros dados.
 */
export default function MarcadoresLugares({ lugares, onTocar, emAlerta = [], areas = [] }: Props) {
  const { current: mapRef } = useMap();
  const [zoom, setZoom] = useState(() => mapRef?.getZoom() ?? 0);
  // Lado e haste de cada etiqueta, lidos do mapa no fim de cada zoom (ler a projeção no render
  // seria impuro e o React Compiler guardaria o valor do primeiro zoom). Arrastar não muda nada.
  const [posicoes, setPosicoes] = useState<Partial<Record<TipoLocal, ReturnType<typeof posicaoDaEtiqueta>>>>({});

  useEffect(() => {
    const mapa = mapRef?.getMap();
    if (!mapa) return;
    const atualizar = () => {
      const z = mapa.getZoom();
      const raio = (tamanhoParaZoom(z)?.diametro ?? 0) / 2;
      const novas: Partial<Record<TipoLocal, ReturnType<typeof posicaoDaEtiqueta>>> = {};
      const circulos = areas.map((a) => ({ id: a.id, ...mapa.project([a.longitude, a.latitude]) }));
      for (const l of lugares) {
        const p = mapa.project([l.longitude, l.latitude]);
        const desvio = (c: { x: number; y: number }) => ({ dx: c.x - p.x, dy: c.y - p.y });
        const proprio = circulos.find((c) => c.id === l.subprefeituraId);
        const outros = circulos.filter((c) => c.id !== l.subprefeituraId).map(desvio);
        // Largura real da etiqueta quando já existe; antes do primeiro zoom de perto, a maior delas.
        const largura = document.querySelector<HTMLElement>(`.lugar-marcador[data-lugar="${l.tipo}"] .lugar-etiqueta`)?.offsetWidth ?? 104;
        novas[l.tipo] = posicaoDaEtiqueta(proprio && desvio(proprio), outros, raio, largura);
      }
      setZoom(z);
      setPosicoes(novas);
    };
    const quadro = requestAnimationFrame(atualizar);
    mapa.on('zoomend', atualizar);
    return () => {
      cancelAnimationFrame(quadro);
      mapa.off('zoomend', atualizar);
    };
  }, [mapRef, lugares, areas]);

  const modo = modoDoMarcador(zoom);

  return (
    <>
      {lugares.map((l) => {
        const Icone = l.tipo === 'CASA' ? House : BriefcaseBusiness;
        const nome = ROTULO_TIPO[l.tipo];
        const alerta = emAlerta.includes(l.tipo);
        const { lado, haste } = posicoes[l.tipo] ?? { lado: 'direita' as const, haste: 10 };
        // Na etiqueta, o pé (9 px) é a ponta do lado âncora: meio pé para fora deixa o centro dele no ponto exato.
        const ancora = modo === 'ponto' ? 'center' : lado === 'direita' ? 'left' : 'right';
        const desvio: [number, number] = modo === 'ponto' ? [0, 0] : [lado === 'direita' ? -4.5 : 4.5, 0];
        return (
          // A âncora entra na key: o Marker do react-map-gl só lê `anchor` ao ser criado, e trocar de
          // ponto para etiqueta (ou de lado) sem recriá-lo deixava o pé longe do ponto exato.
          <Marker key={`${l.tipo}-${ancora}`} longitude={l.longitude} latitude={l.latitude} anchor={ancora} offset={desvio}
            // Acima dos círculos de score (que são Markers sem ponteiro).
            style={{ zIndex: 2 }}>
            <button type="button" className="lugar-marcador" data-modo={modo} data-lugar={l.tipo} data-lado={lado}
              data-alerta={alerta ? '' : undefined}
              aria-label={`${nome}, ${l.rotulo}.${alerta ? ' Alagamento na região.' : ''} Ver chuva e risco`}
              onClick={(e) => { e.stopPropagation(); onTocar(l.tipo); }}>
              {modo === 'ponto' ? (
                <span className="lugar-ponto"><Icone size={12} strokeWidth={2.5} aria-hidden="true" />{alerta && <SeloAlerta />}</span>
              ) : (
                <>
                  <span className="lugar-etiqueta superficie">
                    <span className="lugar-etiqueta-icone"><Icone size={13} strokeWidth={2.5} aria-hidden="true" /></span>
                    {nome}
                    {alerta && <SeloAlerta />}
                  </span>
                  <span aria-hidden="true" className="lugar-haste" style={{ width: haste }} />
                  <span aria-hidden="true" className="lugar-pe" />
                </>
              )}
            </button>
          </Marker>
        );
      })}
    </>
  );
}

/** Alagamento na região: o anel é cor, o selo é forma (risco nunca só pela cor). */
const SeloAlerta = () => (
  <span aria-hidden="true" className="lugar-selo-alerta"><TriangleAlert size={9} strokeWidth={3} /></span>
);
