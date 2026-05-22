import { useEffect, useRef } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import type { GeoJsonObject, Feature } from 'geojson';
import type { Layer, PathOptions, LeafletMouseEvent } from 'leaflet';
import type { RegiaoDto } from '../../types';
import { coresParaFaixa, labelFaixa, scoreFormatado } from '../../utils/risco';

interface Props {
  geojson: GeoJsonObject;
  regioes: RegiaoDto[];
  regiaoSelecionada: string | null;
  onSelecionarRegiao: (nome: string) => void;
}

// Mapeia o nome da região do GeoJSON → RegiaoDto
function encontrarRegiao(nomeGeoJson: string, regioes: RegiaoDto[]): RegiaoDto | undefined {
  const normalizado = nomeGeoJson.toLowerCase().trim();
  return regioes.find((r) => r.nome.toLowerCase().trim() === normalizado);
}

export default function RegioesLayer({
  geojson,
  regioes,
  regiaoSelecionada,
  onSelecionarRegiao,
}: Props) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);

  // Re-estilizar quando regioes ou seleção mudar
  useEffect(() => {
    if (!layerRef.current) return;
    layerRef.current.setStyle((feature) => {
      const nomeRegiao: string = feature?.properties?.nm_regiao_05 ?? '';
      const regiao = encontrarRegiao(nomeRegiao, regioes);
      const selecionada = regiao?.nome === regiaoSelecionada;
      return estilizar(regiao ?? null, selecionada);
    });
  }, [regioes, regiaoSelecionada]);

  function estilizar(regiao: RegiaoDto | null, selecionada = false): PathOptions {
    const cores = coresParaFaixa(regiao?.faixaRisco);
    return {
      fillColor: cores.fill,
      fillOpacity: selecionada ? cores.fillOpacity + 0.2 : cores.fillOpacity,
      color: selecionada ? '#0084D1' : cores.border,
      weight: selecionada ? 2.5 : 1.5,
      opacity: 0.9,
    };
  }

  function onEachFeature(feature: Feature, layer: Layer) {
    const nomeRegiao: string = (feature.properties as Record<string, string>)?.nm_regiao_05 ?? '';
    const nomeSub: string = (feature.properties as Record<string, string>)?.nm_subprefeitura ?? '';
    const regiao = encontrarRegiao(nomeRegiao, regioes);

    // Tooltip ao hover
    const tooltipContent = `
      <div style="font-family: DM Sans, sans-serif; min-width: 160px;">
        <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px;">
          ${nomeSub}
        </div>
        <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">
          Região: <b>${nomeRegiao}</b>
        </div>
        ${
          regiao
            ? `<div style="font-size: 12px;">
                Score: <b style="font-family: JetBrains Mono, monospace;">${scoreFormatado(regiao.scoreAtual)}</b>
                — <b>${labelFaixa(regiao.faixaRisco)}</b>
               </div>`
            : '<div style="font-size: 12px; color: #94a3b8;">Sem dados no momento</div>'
        }
      </div>
    `;

    (layer as L.Path).bindTooltip(tooltipContent, {
      sticky: true,
      className: 'pulsar-tooltip',
    });

    layer.on({
      mouseover: (e: LeafletMouseEvent) => {
        const target = e.target as L.Path;
        target.setStyle({ weight: 2.5, opacity: 1 });
        target.bringToFront();
      },
      mouseout: (e: LeafletMouseEvent) => {
        if (layerRef.current) {
          layerRef.current.resetStyle(e.target as L.Path);
        }
      },
      click: () => {
        onSelecionarRegiao(nomeRegiao);
        // Centralizar mapa na região clicada
        const bounds = (layer as L.Polygon).getBounds();
        map.fitBounds(bounds, { padding: [40, 40] });
      },
    });
  }

  return (
    <GeoJSON
      key={regioes.length} // força re-render quando dados chegam
      ref={layerRef}
      data={geojson}
      style={(feature) => {
        const nomeRegiao: string = feature?.properties?.nm_regiao_05 ?? '';
        const regiao = encontrarRegiao(nomeRegiao, regioes);
        const selecionada = regiao?.nome === regiaoSelecionada;
        return estilizar(regiao ?? null, selecionada);
      }}
      onEachFeature={onEachFeature}
    />
  );
}
