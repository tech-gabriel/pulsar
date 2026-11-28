import { useEffect, useMemo, useRef, useState } from 'react';
import { useMap } from 'react-map-gl/maplibre';
import { campoDoVento, deveAnimar } from '../../features/mapa/ventoCampo';
import type { SubprefeituraMapaDto } from '../../types';
import { ID_VENTO, camadaVento, type ModoVento } from './VentoParticulas';

interface Props {
  areas: SubprefeituraMapaDto[];
  celulas: { h3: string; areaId: string }[];
  centros: Record<string, [number, number]>;
  tema: 'light' | 'dark';
  reduzido: boolean;
  beforeId?: string;
}

/** Tracinhos do vento (custom layer WebGL). Montar só com a camada Vento aberta. */
export default function VentoLayer({ areas, celulas, centros, tema, reduzido, beforeId }: Props) {
  const { current: mapRef } = useMap();
  const campo = useMemo(() => campoDoVento(areas, celulas, centros), [areas, celulas, centros]);
  const [visivel, setVisivel] = useState(() => typeof document === 'undefined' || !document.hidden);

  useEffect(() => {
    const aoMudar = () => setVisivel(!document.hidden);
    document.addEventListener('visibilitychange', aoMudar);
    return () => document.removeEventListener('visibilitychange', aoMudar);
  }, []);

  // A camada lê o modo a cada quadro; mudar o modo não recria nada, só pede um quadro novo.
  const modo = useRef<ModoVento>('nada');
  useEffect(() => {
    modo.current = deveAnimar({ camada: 'vento', reduzido, visivel, temCampo: campo.length > 0 });
    mapRef?.getMap().triggerRepaint();
  }, [mapRef, reduzido, visivel, campo.length]);

  useEffect(() => {
    const mapa = mapRef?.getMap();
    if (!mapa || !campo.length) return;
    const camada = camadaVento(campo, tema === 'light', () => modo.current);
    // A troca do estilo base apaga camadas imperativas: põe de volta quando o estilo novo chega.
    const garantir = () => {
      if (mapa.getLayer(ID_VENTO)) return;
      // isStyleLoaded() fica falso enquanto tiles carregam; o addLayer só recusa estilo ainda não lido.
      try {
        mapa.addLayer(camada, beforeId && mapa.getLayer(beforeId) ? beforeId : undefined);
      } catch {
        /* estilo ainda chegando: o próximo styledata tenta de novo */
      }
    };
    garantir();
    mapa.on('styledata', garantir);
    return () => {
      mapa.off('styledata', garantir);
      // Cleanup pode rodar depois do map.remove(): sem estilo, não há o que tirar.
      if (mapa.style && mapa.getLayer(ID_VENTO)) mapa.removeLayer(ID_VENTO);
    };
  }, [mapRef, campo, tema, beforeId]);

  return null;
}
