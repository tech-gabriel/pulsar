import { useMemo, useState } from 'react';
import { Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { GeoJsonObject, FeatureCollection, Feature } from 'geojson';
import type { RegiaoDto } from '../../types';
import { coresParaFaixa, scoreFormatado } from '../../utils/risco';

interface Props {
  geojson: GeoJsonObject;
  regioes: RegiaoDto[];
  onSelecionarRegiao: (nome: string) => void;
}

function encontrarRegiao(nomeGeoJson: string, regioes: RegiaoDto[]): RegiaoDto | undefined {
  const normalizado = nomeGeoJson.toLowerCase().trim();
  return regioes.find((r) => r.nome.toLowerCase().trim() === normalizado);
}

interface LabelData {
  nome: string;
  center: L.LatLng;
  regiao: RegiaoDto;
}

// Fonte do label escala com o zoom (base SP_ZOOM = 10), limitada a [11, 22]px.
function fontSizeParaZoom(zoom: number): number {
  return Math.max(11, Math.min(22, 11 + (zoom - 10) * 2.5));
}

export default function ScoreLabels({ geojson, regioes, onSelecionarRegiao }: Props) {
  const map = useMap();
  const [zoom, setZoom] = useState<number>(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  // Um label por região, posicionado no centro do conjunto de subprefeituras.
  const labels = useMemo<LabelData[]>(() => {
    const fc = geojson as FeatureCollection;
    if (!fc?.features) return [];

    const grupos = new Map<string, Feature[]>();
    for (const feature of fc.features) {
      const nome = (feature.properties as Record<string, string>)?.nm_regiao_05 ?? '';
      if (!nome) continue;
      const lista = grupos.get(nome) ?? [];
      lista.push(feature);
      grupos.set(nome, lista);
    }

    const resultado: LabelData[] = [];
    for (const [nome, features] of grupos) {
      const regiao = encontrarRegiao(nome, regioes);
      if (!regiao) continue;
      const bounds = L.geoJSON({ type: 'FeatureCollection', features } as GeoJsonObject).getBounds();
      if (!bounds.isValid()) continue;
      resultado.push({ nome, center: bounds.getCenter(), regiao });
    }
    return resultado;
  }, [geojson, regioes]);

  const fontSize = fontSizeParaZoom(zoom);

  return (
    <>
      {labels.map(({ nome, center, regiao }) => {
        const cores = coresParaFaixa(regiao.faixaRisco);
        const icon = L.divIcon({
          className: 'pulsar-score-label',
          iconSize: [0, 0],
          html: `<span class="pulsar-score-pill" style="background:${cores.fill};font-size:${fontSize}px;">${scoreFormatado(regiao.scoreAgregado)}</span>`,
        });
        return (
          <Marker
            key={nome}
            position={center}
            icon={icon}
            keyboard={false}
            eventHandlers={{ click: () => onSelecionarRegiao(nome) }}
          />
        );
      })}
    </>
  );
}
