import { useEffect, useMemo, useRef, useState } from 'react';
import { Layer, Popup, Source, useMap } from 'react-map-gl/maplibre';
import type { MapLayerMouseEvent } from 'maplibre-gl';
import { pontosCriticosGeojson, textoPontoCritico, type PontoCritico } from '../../features/cidade/pontosCriticos';
import { PALETA } from '../../utils/paleta';
import { ID_TOQUE_PONTOS_CRITICOS } from './camadasPorCima';

const FONTE = 'pulsar-pontos-criticos';
const DISCO = 'pulsar-pontos-criticos-disco';
const GLIFO = 'pulsar-pontos-criticos-glifo';
/** Alvo invisível do toque: 44 px, o mínimo da Apple e do WCAG, mesmo com o disco menor. */
const TOQUE = ID_TOQUE_PONTOS_CRITICOS;

/**
 * Pontos onde costuma alagar na Baixada (D3, escolha do user em 18/11/2026): entram com a camada
 * de alagamentos (a gota), como o histórico da capital, e não pesam no número da área.
 */
export default function PontosCriticosLayer({ pontos }: { pontos: PontoCritico[] }) {
  const { current: mapRef } = useMap();
  const dados = useMemo(() => pontosCriticosGeojson(pontos), [pontos]);
  const [aberto, setAberto] = useState<PontoCritico | null>(null);
  // O handler é registrado uma vez só e lê a lista atual.
  const pontosRef = useRef(pontos);
  useEffect(() => {
    pontosRef.current = pontos;
  });

  useEffect(() => {
    const mapa = mapRef?.getMap();
    if (!mapa) return;
    const clicar = (e: MapLayerMouseEvent) => {
      const p = pontosRef.current[Number(e.features?.[0]?.properties?.i)];
      if (p) setAberto(p);
    };
    const ponteiro = () => (mapa.getCanvas().style.cursor = 'pointer');
    const solto = () => (mapa.getCanvas().style.cursor = '');
    mapa.on('click', TOQUE, clicar);
    mapa.on('mouseenter', TOQUE, ponteiro);
    mapa.on('mouseleave', TOQUE, solto);
    return () => {
      mapa.off('click', TOQUE, clicar);
      mapa.off('mouseenter', TOQUE, ponteiro);
      mapa.off('mouseleave', TOQUE, solto);
    };
  }, [mapRef]);

  const texto = aberto ? textoPontoCritico(aberto) : null;

  return (
    <>
      <Source id={FONTE} type="geojson" data={dados}>
        <Layer id={DISCO} type="circle"
          paint={{ 'circle-radius': 11, 'circle-color': PALETA.ambarEscuro, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2.5 }} />
        <Layer id={GLIFO} type="symbol"
          layout={{ 'text-field': '!', 'text-font': ['Noto Sans Bold'], 'text-size': 15, 'text-allow-overlap': true }}
          paint={{ 'text-color': '#ffffff' }} />
        <Layer id={TOQUE} type="circle" paint={{ 'circle-opacity': 0, 'circle-radius': 22 }} />
      </Source>
      {aberto && texto && (
        <Popup longitude={aberto.lon} latitude={aberto.lat} offset={16} closeButton={false} onClose={() => setAberto(null)} className="pulsar-popup-ocorrencia">
          <div style={{ fontSize: 12, maxWidth: 240 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: PALETA.ambarEscuro }}>Costuma alagar</div>
            <strong style={{ display: 'block', fontSize: 14 }}>{aberto.nome}</strong>
            <div>{texto.quando}</div>
            <a href={aberto.fonte} target="_blank" rel="noopener noreferrer" style={{ opacity: 0.8 }}>Fonte: {texto.fonte}</a>
          </div>
        </Popup>
      )}
    </>
  );
}
