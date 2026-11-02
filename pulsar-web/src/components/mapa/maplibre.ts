import maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-csp-worker.js?url';
import 'maplibre-gl/dist/maplibre-gl.css';

// Build CSP (alias no vite.config): o worker vem de /assets, que o worker-src 'self' aceita.
maplibregl.setWorkerUrl(workerUrl);

export default maplibregl;

/** Sem WebGL o MapLibre não desenha nada; o MapaBase mostra um aviso no lugar. */
export function temWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
