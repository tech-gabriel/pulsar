import { useEffect, useState } from 'react';
import { Marker, useMap } from 'react-map-gl/maplibre';
import { BriefcaseBusiness, House } from 'lucide-react';
import type { LocalSalvoDto, TipoLocal } from '../../types';
import { ROTULO_TIPO } from '../../features/locais/regras';
import { modoDoMarcador } from '../../features/locais/estadoLugar';

interface Props {
  lugares: LocalSalvoDto[];
  onTocar: (tipo: TipoLocal) => void;
}

/**
 * Casa e trabalho no mapa (F4b, opção D). Na vista da cidade, um ponto de 24 px menor que os
 * círculos de score; de perto, a etiqueta com o nome, presa ao ponto exato por uma haste.
 * Só o mapa do app desenha isto: o card de compartilhar recebe outros dados.
 */
export default function MarcadoresLugares({ lugares, onTocar }: Props) {
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

  const modo = modoDoMarcador(zoom);

  return (
    <>
      {lugares.map((l) => {
        const Icone = l.tipo === 'CASA' ? House : BriefcaseBusiness;
        const nome = ROTULO_TIPO[l.tipo];
        return (
          <Marker key={l.tipo} longitude={l.longitude} latitude={l.latitude} anchor={modo === 'ponto' ? 'center' : 'bottom'}
            // Acima dos círculos de score (que são Markers sem ponteiro).
            style={{ zIndex: 2 }}>
            <button type="button" aria-label={nome} className="lugar-marcador" data-modo={modo}
              onClick={(e) => { e.stopPropagation(); onTocar(l.tipo); }}>
              {modo === 'ponto' ? (
                <span className="lugar-ponto"><Icone size={12} strokeWidth={2.5} aria-hidden="true" /></span>
              ) : (
                <>
                  <span className="lugar-etiqueta superficie">
                    <span className="lugar-etiqueta-icone"><Icone size={13} strokeWidth={2.5} aria-hidden="true" /></span>
                    {nome}
                  </span>
                  <span aria-hidden="true" className="lugar-haste" />
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
