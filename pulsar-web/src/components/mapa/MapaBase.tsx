import { lazy, Suspense, useState } from 'react';
import type { GeoJsonObject } from 'geojson';
import type { OcorrenciaAlagamentoDto, SubprefeituraMapaDto } from '../../types';
import type { Camada } from '../../utils/camadas';
import { temWebGL } from './webgl';

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
}

// O MapLibre (e o worker dele) vêm num chunk próprio: a página, o painel e a busca aparecem antes.
const MapaGL = lazy(() => import('./MapaGL'));

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
