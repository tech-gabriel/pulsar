import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';

// O worker vem empacotado em /assets (mesma origem), que o worker-src 'self' da CSP aceita.
maplibregl.setWorkerUrl(workerUrl);
// Sobe os workers já na chegada do chunk, em paralelo ao estilo, e não só quando o mapa nasce.
maplibregl.prewarm();

export default maplibregl;
