import { Minus, Plus } from 'lucide-react';
import { useMap } from 'react-map-gl/maplibre';

/** Zoom em vidro, no mesmo visual dos outros controles do mapa (posição por classe em index.css). */
export default function ZoomControles({ lado }: { lado: 'direita' | 'esquerda' }) {
  const { current: mapa } = useMap();
  return (
    <div className={`mapa-controle zoom-pilula zoom-pilula--${lado}`}>
      <button type="button" aria-label="Aproximar" onClick={() => mapa?.zoomIn()}>
        <Plus size={18} strokeWidth={2.2} aria-hidden="true" />
      </button>
      <button type="button" aria-label="Afastar" onClick={() => mapa?.zoomOut()}>
        <Minus size={18} strokeWidth={2.2} aria-hidden="true" />
      </button>
    </div>
  );
}
