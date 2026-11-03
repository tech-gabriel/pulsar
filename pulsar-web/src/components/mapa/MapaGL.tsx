import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import Map, { AttributionControl, Layer, Marker, Source, type MapRef } from 'react-map-gl/maplibre';
import type { GeoJSONSource, StyleSpecification } from 'maplibre-gl';
import maplibregl from './maplibre';
import { comChaveMapTiler, estiloBaseCompartilhado, urlReservaMapTiler } from './estiloBase';
import { circuloGeojson, deslocamentoDoPainel, paddingDaRota, paddingDoPainel } from './geometria';
import { ZOOM } from './zoom';
import ZoomControles from './ZoomControles';
import RegioesLayer from './RegioesLayer';
import ScoreLabel from './ScoreLabel';
import OcorrenciasLayer from './OcorrenciasLayer';
import type { FeatureCollection } from 'geojson';
import { chaveGeometria, cortarRota } from '../../features/rota/desenho';
import { centroideRegiao } from '../../utils/geo';
import { normalizarNome } from '../../utils/texto';
import { useTheme } from '../../hooks/useTheme';
import { useIsMobile } from '../../hooks/useIsMobile';
import type { PropsMapa } from './MapaBase';

const SP: [number, number] = [-46.6333, -23.5505]; // lon, lat
const ESPERA_ESTILO_MS = 8000;
const CHAVE_MAPTILER = import.meta.env.VITE_MAPTILER_KEY as string | undefined;
const COR_BUSCA = '#00BCFF';
// Marinho da marca: o miolo do destino e a borda da origem na rota.
const COR_PONTO_ROTA = '#052F4A';
// Halo da linha e contorno dos pontos da rota: o branco do texto sobre o azul da marca (#fff),
// que separa o traçado do mapa nos dois temas.
const COR_HALO_ROTA = '#ffffff';
const DESENHO_MS = 600;
// Aproxima a curva de chegada do app, cubic-bezier(.16, 1, .3, 1): sai rápido e assenta devagar.
const chegada = (x: number) => 1 - Math.pow(1 - x, 4);

/** Pin da busca: o mesmo SVG de antes do MapLibre. */
function PinBusca() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }} aria-hidden="true">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill={COR_BUSCA} stroke="#ffffff" strokeWidth="1.5" />
      <circle cx="12" cy="9" r="2.5" fill="#ffffff" />
    </svg>
  );
}

/** Primeiro rótulo do estilo base: as camadas do Pulsar entram antes dele (nomes por cima do risco). */
function primeiroSimbolo(mapa: maplibregl.Map): string | undefined {
  return mapa.getStyle()?.layers.find((l) => l.type === 'symbol' && !l.id.startsWith('pulsar-'))?.id;
}

export default function MapaGL(props: PropsMapa) {
  const { geojson, subprefeituras, subSelecionada, onSelecionarSub, camadaAtiva, zonaEmFoco, subSelecionadaAtiva, pontoBusca, onMoverPonto, overlayAlagamento, ocorrencias, rota } = props;
  const { theme } = useTheme();
  const isMobile = useIsMobile(768);
  const mapRef = useRef<MapRef>(null);
  const [estiloOfm, setEstiloOfm] = useState<StyleSpecification | null>(null);
  const [reserva, setReserva] = useState(false);
  const [carregou, setCarregou] = useState(false);
  const [idPrimeiroSimbolo, setIdPrimeiroSimbolo] = useState<string | undefined>();
  const estilo = reserva ? (CHAVE_MAPTILER ? urlReservaMapTiler(theme, CHAVE_MAPTILER) : null) : estiloOfm;

  // Estilo base do tema; se o OpenFreeMap falhar, a reserva do MapTiler vale até sair do mapa.
  useEffect(() => {
    if (reserva) return;
    // A busca é compartilhada (o MapaBase já a começou); ao trocar de tema só ignora a resposta velha.
    let valendo = true;
    estiloBaseCompartilhado(theme)
      .then((e) => valendo && setEstiloOfm(e))
      .catch(() => valendo && setReserva(true));
    return () => {
      valendo = false;
    };
  }, [theme, reserva]);

  // Só na abertura: sem `load` em 8 s, cai para a reserva.
  useEffect(() => {
    if (carregou) return;
    const t = window.setTimeout(() => setReserva(true), ESPERA_ESTILO_MS);
    return () => window.clearTimeout(t);
  }, [carregou]);

  function voar(lonLat: [number, number], zoom: number, duracaoMs: number) {
    const mapa = mapRef.current;
    if (!mapa) return;
    mapa.flyTo({ center: lonLat, zoom, duration: duracaoMs, offset: deslocamentoDoPainel(paddingDoPainel(mapa.getContainer())) });
  }

  // Seleção vinda de clique no mapa: o próprio clique já voou para a subprefeitura.
  const subSelRef = useRef(subSelecionadaAtiva);
  useEffect(() => {
    subSelRef.current = subSelecionadaAtiva;
  });

  useEffect(() => {
    if (!carregou) return;
    if (!zonaEmFoco) {
      voar(SP, ZOOM.sp, 600);
      return;
    }
    if (subSelRef.current) return;
    const centro = centroideRegiao(subprefeituras.filter((s) => normalizarNome(s.zona) === normalizarNome(zonaEmFoco)));
    if (centro) voar([centro.lon, centro.lat], ZOOM.regiao, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zonaEmFoco, carregou]);

  // A subprefeitura escolhida na lista, na busca ou no sino vira o foco do mapa.
  useEffect(() => {
    if (carregou && subSelecionada) voar([subSelecionada.longitude, subSelecionada.latitude], ZOOM.sub, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subSelecionada?.id, carregou]);

  // Resultado da busca ou "minha região": voa até o ponto; com precisão, enquadra o círculo inteiro.
  useEffect(() => {
    const mapa = mapRef.current;
    if (!carregou || !mapa || !pontoBusca || pontoBusca.ajustado) return;
    if (pontoBusca.precisao !== undefined) {
      const anel = circuloGeojson(pontoBusca.lat, pontoBusca.lon, pontoBusca.precisao).geometry.coordinates[0];
      const lons = anel.map(([lon]) => lon);
      const lats = anel.map(([, lat]) => lat);
      mapa.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], {
        maxZoom: ZOOM.busca, duration: 800, padding: paddingDoPainel(mapa.getContainer()),
      });
    } else {
      voar([pontoBusca.lon, pontoBusca.lat], ZOOM.busca, 800);
    }
  }, [pontoBusca, carregou]);

  // Traçado da rota. A linha se desenha da origem ao destino depois do enquadramento, cortando a
  // geometria quadro a quadro (o MapLibre não tem line-trim); o destino "nasce" no fim. Cor nova
  // com os mesmos pontos (a resposta chegou) só repinta, no ponto em que o desenho está.
  // O desenho guarda a chave dos pontos e a fração desenhada (0 no começo, 1 no fim; no meio o
  // rAF escreve direto na fonte). O Source só aparece com o desenho da rota atual: uma rota
  // velha (fechar e abrir, ponto novo) nunca pinta nem um quadro.
  const [desenho, setDesenho] = useState<{ chave: string; t: number } | null>(null);
  const [destinoNasceu, setDestinoNasceu] = useState(false);
  const rotaRef = useRef(rota);
  const progresso = useRef(1);
  const chaveRota = rota ? chaveGeometria(rota) : null;
  const reduzido = !!useReducedMotion();
  // Na saída e na chegada o número da subprefeitura cobriria o ponto da rota: some no modo rota.
  const ocultos = useMemo(
    () => new Set((rota?.features ?? []).map((f) => f.properties?.subId as string | undefined).filter((id): id is string => !!id)),
    [rota],
  );

  // Antes do efeito de desenho (layout, roda primeiro), que lê a rota atual daqui.
  useLayoutEffect(() => {
    rotaRef.current = rota;
  }, [rota]);

  const dadosRota = useMemo(() => (rota && desenho ? cortarRota(rota, desenho.t) : null), [rota, desenho]);

  // Cor nova no meio do desenho: o Source acabou de receber o corte da fração salva; este efeito
  // (do pai, roda depois do dele) devolve a linha à fração em que o desenho está.
  useEffect(() => {
    if (!rota || progresso.current >= 1) return;
    (mapRef.current?.getMap().getSource('pulsar-rota') as GeoJSONSource | undefined)?.setData(cortarRota(rota, progresso.current));
  }, [rota]);

  // Rota nova: enquadra o caminho inteiro, com folga para o painel, e desenha. Um ponto novo no
  // meio do desenho cancela este e recomeça.
  useLayoutEffect(() => {
    const mapa = mapRef.current?.getMap();
    const r = rotaRef.current;
    if (!carregou || !mapa || !r || !chaveRota) return;
    const coords = r.features.flatMap((f) => (f.geometry.type === 'Point' ? [f.geometry.coordinates] : f.geometry.type === 'LineString' ? f.geometry.coordinates : []));
    if (coords.length === 0) return;
    const lons = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    mapa.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], {
      maxZoom: ZOOM.sub, duration: 700, padding: paddingDaRota(mapa.getContainer()),
    });

    let raf = 0;
    let espera = 0;
    let comecou = false;
    setDestinoNasceu(false);
    // Menos movimento: a linha inteira de uma vez, aparecendo por opacidade.
    progresso.current = reduzido ? 1 : 0;
    setDesenho({ chave: chaveRota, t: progresso.current });
    const desenhar = () => {
      if (comecou) return;
      comecou = true;
      const inicio = performance.now();
      const passo = (agora: number) => {
        const x = Math.min(1, (agora - inicio) / DESENHO_MS);
        progresso.current = x < 1 ? chegada(x) : 1;
        const atual = rotaRef.current ?? r;
        if (x < 1) {
          (mapa.getSource('pulsar-rota') as GeoJSONSource | undefined)?.setData(cortarRota(atual, progresso.current));
          raf = requestAnimationFrame(passo);
        } else {
          setDesenho({ chave: chaveRota, t: 1 });
          setDestinoNasceu(true);
        }
      };
      raf = requestAnimationFrame(passo);
    };
    if (reduzido) {
      raf = requestAnimationFrame(() => setDestinoNasceu(true));
    } else {
      // Começa quando o enquadramento termina; se o mapa não precisou mover, a espera garante.
      mapa.once('moveend', desenhar);
      espera = window.setTimeout(desenhar, 800);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(espera);
      mapa.off('moveend', desenhar);
    };
  }, [chaveRota, carregou, reduzido]);

  // Objeto estável: um GeoJSON novo a cada render faria o Source reprocessar o círculo no worker.
  const precisao = pontoBusca?.precisao;
  const circulo = useMemo(
    () => (pontoBusca && precisao !== undefined ? circuloGeojson(pontoBusca.lat, pontoBusca.lon, precisao) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pontoBusca?.lat, pontoBusca?.lon, precisao],
  );

  if (!estilo) return <div className="w-full h-full" style={{ background: 'var(--bg-primary)' }} />;

  return (
    <Map
      ref={mapRef}
      mapLib={maplibregl}
      mapStyle={estilo}
      initialViewState={{ longitude: SP[0], latitude: SP[1], zoom: ZOOM.sp }}
      style={{ width: '100%', height: '100%' }}
      attributionControl={false}
      // Sempre: o react-map-gl só lê o transformRequest ao criar o mapa, e a reserva pode entrar depois.
      // O comChaveMapTiler não mexe em URL que não seja do MapTiler.
      transformRequest={CHAVE_MAPTILER ? (url) => ({ url: comChaveMapTiler(url, CHAVE_MAPTILER) }) : undefined}
      onLoad={(e) => {
        performance.mark('mapa-base');
        setCarregou(true);
        setIdPrimeiroSimbolo(primeiroSimbolo(e.target));
        e.target.once('idle', () => performance.mark('mapa-pronto'));
      }}
      // styledata dispara a cada mudança de pintura (a animação da borda muda a cada 70 ms): só
      // recalcula quando o rótulo de referência sumiu, ou seja, quando o estilo base foi trocado.
      onStyleData={(e) => {
        if (idPrimeiroSimbolo && e.target.getLayer(idPrimeiroSimbolo)) return;
        setIdPrimeiroSimbolo(primeiroSimbolo(e.target));
      }}
    >
      <ZoomControles lado={isMobile ? 'direita' : 'esquerda'} />
      <AttributionControl compact position="bottom-right" />

      {geojson && carregou && (
        <>
          <RegioesLayer
            geojson={geojson as FeatureCollection}
            subprefeituras={subprefeituras}
            subSelecionada={subSelecionada}
            onSelecionarSub={onSelecionarSub}
            camadaAtiva={camadaAtiva}
            zonaEmFoco={zonaEmFoco}
            idPrimeiroSimbolo={idPrimeiroSimbolo}
          />
          <ScoreLabel
            subprefeituras={subprefeituras}
            subSelecionada={subSelecionada}
            camadaAtiva={camadaAtiva}
            zonaEmFoco={zonaEmFoco}
            atenuado={overlayAlagamento}
            ocultos={ocultos}
          />
        </>
      )}

      {circulo && (
        <Source id="pulsar-precisao" type="geojson" data={circulo}>
          <Layer id="pulsar-precisao-fill" type="fill" paint={{ 'fill-color': COR_BUSCA, 'fill-opacity': 0.12 }} />
          <Layer id="pulsar-precisao-linha" type="line" paint={{ 'line-color': COR_BUSCA, 'line-width': 1 }} />
        </Source>
      )}
      {dadosRota && desenho?.chave === chaveRota && (
        // Abaixo dos rótulos, como as regiões: um corredor avaliado, não um trajeto. Tracejado na
        // cor de cada trecho sobre um halo branco (lê no mapa claro e no escuro), com um ponto onde
        // o caminho entra em cada subprefeitura.
        <Source id="pulsar-rota" type="geojson" data={dadosRota}>
          <Layer id="pulsar-rota-borda" type="line" beforeId={idPrimeiroSimbolo} filter={['==', ['geometry-type'], 'LineString']}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': COR_HALO_ROTA, 'line-width': 9, 'line-opacity': reduzido && !destinoNasceu ? 0 : 0.92, 'line-opacity-transition': { duration: 200, delay: 0 } }} />
          <Layer id="pulsar-rota-linha" type="line" beforeId={idPrimeiroSimbolo} filter={['==', ['geometry-type'], 'LineString']}
            layout={{ 'line-cap': 'butt', 'line-join': 'round' }}
            paint={{ 'line-color': ['get', 'cor'], 'line-width': 5, 'line-dasharray': [2, 1.4], 'line-opacity': reduzido && !destinoNasceu ? 0 : 1, 'line-opacity-transition': { duration: 200, delay: 0 } }} />
          <Layer id="pulsar-rota-entrada" type="circle" filter={['==', ['get', 'papel'], 'entrada']}
            paint={{ 'circle-radius': 4.5, 'circle-color': ['get', 'cor'], 'circle-stroke-color': COR_HALO_ROTA, 'circle-stroke-width': 2 }} />
          <Layer id="pulsar-rota-origem" type="circle" filter={['==', ['get', 'papel'], 'origem']}
            paint={{ 'circle-radius': 8, 'circle-color': COR_HALO_ROTA, 'circle-stroke-color': COR_PONTO_ROTA, 'circle-stroke-width': 3.5 }} />
          <Layer id="pulsar-rota-destino" type="circle" filter={['==', ['get', 'papel'], 'destino']}
            paint={{
              'circle-radius': destinoNasceu ? 9 : 0, 'circle-stroke-width': destinoNasceu ? 3 : 0,
              // A opacidade troca na hora: sem ela o destino novo aparecia grande, encolhia e crescia.
              'circle-opacity': destinoNasceu ? 1 : 0, 'circle-stroke-opacity': destinoNasceu ? 1 : 0,
              'circle-opacity-transition': { duration: 0, delay: 0 }, 'circle-stroke-opacity-transition': { duration: 0, delay: 0 },
              'circle-radius-transition': { duration: reduzido ? 0 : 220, delay: 0 },
              'circle-stroke-width-transition': { duration: reduzido ? 0 : 220, delay: 0 },
              'circle-color': COR_PONTO_ROTA, 'circle-stroke-color': COR_HALO_ROTA,
            }} />
        </Source>
      )}
      {pontoBusca && (
        <Marker
          longitude={pontoBusca.lon}
          latitude={pontoBusca.lat}
          anchor="bottom"
          draggable
          onDragEnd={(e) => onMoverPonto(e.lngLat.lat, e.lngLat.lng)}
        >
          <div title="Arraste para ajustar o ponto">
            <PinBusca />
          </div>
        </Marker>
      )}
      {carregou && overlayAlagamento && ocorrencias.length > 0 && <OcorrenciasLayer ocorrencias={ocorrencias} />}
    </Map>
  );
}
