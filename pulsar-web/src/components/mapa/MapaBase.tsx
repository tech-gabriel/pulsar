import { lazy, Suspense, useState } from 'react';
import type { FeatureCollection, GeoJsonObject } from 'geojson';
import type { LocalSalvoDto, OcorrenciaAlagamentoDto, SubprefeituraMapaDto, TipoLocal } from '../../types';
import type { Camada } from '../../utils/camadas';
import { temWebGL } from './webgl';
import { estiloBaseCompartilhado, URL_OPENFREEMAP } from './estiloBase';

export interface PontoBusca {
  lat: number;
  lon: number;
  /** Raio de erro (m) quando o ponto veio da geolocalização: desenha o círculo. */
  precisao?: number;
  /** Ponto arrastado à mão: o mapa já está nele, então não voa de novo. */
  ajustado?: boolean;
}

export interface PropsMapa {
  geojson: GeoJsonObject | null;
  subprefeituras: SubprefeituraMapaDto[];
  subSelecionada: SubprefeituraMapaDto | null;
  onSelecionarSub: (sub: SubprefeituraMapaDto) => void;
  camadaAtiva: Camada;
  zonaEmFoco: string | null;
  subSelecionadaAtiva: boolean;
  pontoBusca: PontoBusca | null;
  /** Pin solto depois de arrastado, para corrigir uma localização imprecisa. */
  onMoverPonto: (lat: number, lon: number) => void;
  overlayAlagamento: boolean;
  ocorrencias: OcorrenciaAlagamentoDto[];
  /** Traçado da rota: linhas com `properties.cor` e os pontos `origem`/`destino`. */
  rota?: FeatureCollection | null;
  /** Esconde o zoom (rota no celular). */
  semZoom?: boolean;
  /** Casa e trabalho da conta (F4b). Vazio ou ausente: nada é desenhado. */
  lugares?: LocalSalvoDto[];
  onTocarLugar?: (tipo: TipoLocal) => void;
  /** Lugar aberto agora: o mapa aproxima nele. */
  lugarEmFoco?: LocalSalvoDto | null;
}

// O MapLibre (e o worker dele) vêm num chunk próprio: a página, o painel e a busca aparecem antes.
// Tudo o que o mapa precisa começa a baixar junto, assim que a página do mapa carrega (e não em
// fila depois do primeiro render): o chunk, o estilo base do tema e a conexão com o OpenFreeMap.
// A página do mapa é só CSR (lazy em routes.tsx), então o document existe aqui.
const carregarMapaGL = () => import('./MapaGL');
if (typeof document !== 'undefined') {
  const preconexao = document.createElement('link');
  preconexao.rel = 'preconnect';
  preconexao.href = new URL(URL_OPENFREEMAP).origin;
  preconexao.crossOrigin = 'anonymous';
  document.head.appendChild(preconexao);
  void carregarMapaGL();
  void estiloBaseCompartilhado(document.documentElement.classList.contains('light') ? 'light' : 'dark').catch(() => {});
}
const MapaGL = lazy(carregarMapaGL);

function Fundo() {
  return <div className="w-full h-full" style={{ background: 'var(--bg-primary)' }} />;
}

export default function MapaBase(props: PropsMapa) {
  const [webgl] = useState(temWebGL); // /app é só CSR: o document existe aqui
  if (!webgl) {
    return (
      <div role="status" className="mapa-sem-webgl">
        Seu navegador não conseguiu abrir o mapa. A lista, o detalhe e os alertas continuam funcionando.
      </div>
    );
  }
  return (
    <Suspense fallback={<Fundo />}>
      <MapaGL {...props} />
    </Suspense>
  );
}
