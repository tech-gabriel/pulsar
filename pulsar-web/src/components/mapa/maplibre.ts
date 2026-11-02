import maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-csp-worker.js?url';
import 'maplibre-gl/dist/maplibre-gl.css';

// Build CSP (alias no vite.config): o worker vem de /assets, que o worker-src 'self' aceita.
maplibregl.setWorkerUrl(workerUrl);
// Sobe os workers já na chegada do chunk, em paralelo ao estilo, e não só quando o mapa nasce.
maplibregl.prewarm();

export default maplibregl;
