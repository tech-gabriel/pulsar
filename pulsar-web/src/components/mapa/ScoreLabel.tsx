import { useState } from 'react';
import { Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { SubprefeituraMapaDto } from '../../types';
import { estiloCamada, type Camada } from '../../utils/camadas';
import { nomeAbreviado } from '../../utils/nomesSub';

interface Props {
  subprefeituras: SubprefeituraMapaDto[];
  subSelecionada: SubprefeituraMapaDto | null;
  camadaAtiva: Camada;
  regiaoSelecionadaNome: string | null;
}

interface TamanhoLabel {
  diametro: number;
  fonte: number;
  nomeFonte: number; // 0 = nome oculto neste zoom
}

// Comportamento de zoom (ETAPA 2.3/2.7):
//  zoom <= 9  → esconde tudo;  10 → só círculo;  11 → nome 9px;  12 → 10px;  >=13 → 11px.
function tamanhoParaZoom(zoom: number): TamanhoLabel | null {
  if (zoom <= 9) return null;
  if (zoom === 10) return { diametro: 30, fonte: 10, nomeFonte: 0 };
  if (zoom === 11) return { diametro: 32, fonte: 11, nomeFonte: 9 };
  if (zoom === 12) return { diametro: 35, fonte: 12, nomeFonte: 10 };
  return { diametro: 38, fonte: 13, nomeFonte: 11 };
}

// Extrai a opacidade de uma cor rgba(...) para montar o glow (alpha ~0.5).
function glowDaCor(cor: string): string {
  return cor.replace(/[\d.]+\)$/, '0.5)');
}

function normalizar(nome: string): string {
  return nome.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

export default function ScoreLabel({ subprefeituras, subSelecionada, camadaAtiva, regiaoSelecionadaNome }: Props) {
  const map = useMap();
  const [zoom, setZoom] = useState<number>(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  const tamanho = tamanhoParaZoom(zoom);
  if (!tamanho) return null; // mapa muito afastado: esconde os labels

  const { diametro, fonte, nomeFonte } = tamanho;
  const regiaoNorm = regiaoSelecionadaNome ? normalizar(regiaoSelecionadaNome) : null;

  return (
    <>
      {subprefeituras.map((sub) => {
        const estilo = estiloCamada(sub, camadaAtiva);
        const glow = glowDaCor(estilo.corCirculo);
        const selecionada = subSelecionada?.id === sub.id;
        // Esmaecer labels de outras regiões quando há uma região selecionada (4.7).
        const esmaecida = regiaoNorm != null && normalizar(sub.regiaoNome) !== regiaoNorm;
        const opacidade = esmaecida ? 0.2 : 1;

        const classes = [
          'pulsar-score-circle',
          estilo.pulsa ? 'pulsa' : '',
          selecionada ? 'selecionado' : '',
        ].filter(Boolean).join(' ');

        const circuloHtml = `<div class="${classes}" style="width:${diametro}px;height:${diametro}px;font-size:${fonte}px;background:${estilo.corCirculo};box-shadow:0 0 10px ${glow};">${estilo.texto}</div>`;
        const nomeHtml = nomeFonte > 0
          ? `<div class="pulsar-sub-nome" style="font-size:${nomeFonte}px;">${nomeAbreviado(sub.nome)}</div>`
          : '';

        // Container coluna: círculo (no centróide) + nome abaixo. iconAnchor no
        // centro do círculo para o ponto bater com a coordenada da subprefeitura.
        const alturaNome = nomeFonte > 0 ? nomeFonte + 6 : 0;
        const icon = L.divIcon({
          className: 'pulsar-score-label',
          iconSize: [100, diametro + alturaNome],
          iconAnchor: [50, diametro / 2],
          html: `<div class="pulsar-label-wrap" style="opacity:${opacidade};">${circuloHtml}${nomeHtml}</div>`,
        });

        return (
          // key inclui a camada → re-monta o marker ao trocar de camada,
          // disparando a animação de fade (ETAPA 3.3). interactive=false: o label
          // é puramente visual; hover/click são tratados pelo polígono abaixo,
          // evitando tooltip duplicado (ETAPA 3.5).
          <Marker
            key={`${sub.id}-${camadaAtiva}`}
            position={[sub.latitude, sub.longitude]}
            icon={icon}
            keyboard={false}
            interactive={false}
          />
        );
      })}
    </>
  );
}
