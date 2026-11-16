import { useState } from 'react';
import { Info } from 'lucide-react';
import type { Camada } from '../../utils/camadas';
import { PALETA, comAlfa } from '../../utils/paleta';
import MiniIconeOcorrencia from './MiniIconeOcorrencia';
import { corLabelFaixa } from '../../utils/risco';
import { fundoParaTextoBranco, opaca } from '../../utils/contraste';
import type { FaixaRisco } from '../../types';

// ── Legenda dinâmica do mapa (ETAPA 6.1/6.3) ───────────────────────────────────
// Card glassmorphism no canto inferior do mapa. O conteúdo (título, barra de
// gradiente e labels) muda conforme a camada ativa. No desktop é sempre visível;
// no mobile vira um pill colapsável (toque para expandir/recolher).

interface LegendaConfig {
  titulo: string;
  gradiente: string;
  labels: string[];
}

// Os tons saem de utils/paleta.ts, os mesmos que colorem os polígonos em
// utils/camadas.ts: a barra da legenda tem que ser lida como a escala exata do
// que está desenhado no mapa.
function gradiente(...tons: string[]): string {
  return `linear-gradient(to right, ${tons.join(', ')})`;
}

const LEGENDAS: Record<Camada, LegendaConfig> = {
  score: {
    titulo: 'Risco',
    gradiente: gradiente(PALETA.verde, PALETA.amarelo, PALETA.vermelho),
    labels: ['0', '30', '60', '100'],
  },
  temperatura: {
    titulo: 'Temperatura °C',
    gradiente: gradiente(PALETA.azulProfundo, PALETA.azul, PALETA.verde, PALETA.ambar, PALETA.vermelho),
    labels: ['15°', '22°', '27°', '32°', '35°+'],
  },
  chuva: {
    titulo: 'Precipitação mm/h',
    gradiente: gradiente(comAlfa(PALETA.neutro, 0.3), PALETA.azul, PALETA.azulProfundo),
    labels: ['0', '10', '25', '50+'],
  },
  vento: {
    titulo: 'Vento km/h',
    gradiente: gradiente(PALETA.neutro, PALETA.amarelo, PALETA.ambar, PALETA.vermelho),
    labels: ['0', '20', '40', '60', '80+'],
  },
};

// As cores do card vivem em `.mapa-controle` (index.css), que segue o tema.
const TITULO: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontWeight: 500,
  fontSize: 11,
  color: 'var(--mapa-controle-texto)',
};

const LABEL: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontWeight: 400,
  fontSize: 10,
  color: 'var(--mapa-controle-texto-suave)',
};

// Chave do overlay de alagamentos. Aparece junto da escala da camada (e não no
// lugar dela): com o overlay ligado os polígonos continuam coloridos pela
// camada ativa, então as duas leituras convivem no mapa e as duas precisam de
// legenda. As cores acompanham ocorrenciaMarker.ts.
const ITENS_ALAGAMENTO: { tipo: 'ALAGAMENTO' | 'INUNDACAO'; rotulo: string }[] = [
  { tipo: 'ALAGAMENTO', rotulo: 'Alagamento' },
  { tipo: 'INUNDACAO', rotulo: 'Inundação' },
];

interface Props {
  camadaAtiva: Camada;
  isMobile: boolean;
  /** Overlay de alagamentos ligado: acrescenta a chave das ocorrências. */
  overlayAlagamento?: boolean;
  /** Trechos (hexágonos) no mapa: a legenda diz o que eles são. */
  comTrechos?: boolean;
}

// O risco não é contínuo no mapa: são três faixas, com os nomes que o detalhe usa e as cores
// exatas dos círculos (crítica de 15/11: o degradê de 0 a 100 não batia com nada desenhado).
const FAIXAS: { faixa: FaixaRisco; nome: string; de: string }[] = [
  { faixa: 'BAIXO', nome: 'Tranquilo', de: '0 a 30' },
  { faixa: 'MODERADO', nome: 'Atenção', de: '31 a 60' },
  { faixa: 'ALTO', nome: 'Alerta', de: '61 a 100' },
];

function FaixasRisco({ comTrechos }: { comTrechos: boolean }) {
  return (
    <div key="faixas" className="legend-fade">
      <p style={{ ...TITULO, marginBottom: 6 }}>Risco</p>
      <ul className="flex flex-col" style={{ gap: 5 }}>
        {FAIXAS.map(({ faixa, nome, de }) => (
          <li key={faixa} className="flex items-center" style={{ gap: 8 }}>
            <span aria-hidden="true" className="flex-shrink-0 rounded-full"
              style={{ width: 12, height: 12, background: fundoParaTextoBranco(opaca(corLabelFaixa(faixa))) }} />
            <span style={{ ...TITULO, fontSize: 12 }}>{nome}</span>
            <span style={{ ...LABEL, marginLeft: 'auto' }}>{de}</span>
          </li>
        ))}
      </ul>
      {comTrechos && <p style={{ ...LABEL, fontFamily: 'var(--font-body)', marginTop: 6 }}>Hexágono = trecho de cerca de 1 km</p>}
    </div>
  );
}

/** Conteúdo interno (título + barra + labels). A key força o fade ao trocar a camada. */
function ConteudoLegenda({ config, overlayAlagamento, risco, comTrechos }: { config: LegendaConfig; overlayAlagamento: boolean; risco: boolean; comTrechos: boolean }) {
  return (
    <div key={config.titulo} className="legend-fade">
      {risco ? <FaixasRisco comTrechos={comTrechos} /> : (
        <>
          <p style={{ ...TITULO, marginBottom: 6 }}>{config.titulo}</p>
          <div style={{ height: 8, borderRadius: 4, background: config.gradiente }} />
          <div className="flex justify-between" style={{ marginTop: 4 }}>
            {config.labels.map((l) => (
              <span key={l} style={LABEL}>{l}</span>
            ))}
          </div>
        </>
      )}

      {overlayAlagamento && (
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(0, 188, 255, 0.15)' }}>
          <p style={{ ...TITULO, marginBottom: 6 }}>Alagamentos (12 meses)</p>
          <div className="flex flex-col" style={{ gap: 4 }}>
            {ITENS_ALAGAMENTO.map(({ tipo, rotulo }) => (
              <div key={rotulo} className="flex items-center" style={{ gap: 6 }}>
                {/* Miniatura do próprio marcador: a legenda mostra exatamente o
                    desenho que está no mapa, a partir dos mesmos dados. */}
                <span className="flex-shrink-0 inline-flex">
                  <MiniIconeOcorrencia tipo={tipo} lado={16} />
                </span>
                <span style={{ ...LABEL, fontFamily: 'var(--font-body)' }}>{rotulo}</span>
              </div>
            ))}
            <p style={{ ...LABEL, fontFamily: 'var(--font-body)', marginTop: 2 }}>
              Número na bolha = ocorrências agrupadas
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MapLegend({ camadaAtiva, isMobile, overlayAlagamento = false, comTrechos = false }: Props) {
  const risco = camadaAtiva === 'score';
  const config = LEGENDAS[camadaAtiva];
  const [expandido, setExpandido] = useState(false);
  // Com o overlay ligado ele é a informação nova no mapa: o pill colapsado do
  // mobile anuncia os alagamentos, não a escala da camada.
  const tituloPill = overlayAlagamento ? 'Alagamentos' : config.titulo;

  // ── Desktop / tablet: card fixo no canto inferior direito (margin 16px) ──────
  if (!isMobile) {
    return (
      <div
        className="superficie rounded-2xl legenda-mapa pointer-events-auto"
        style={{ padding: '10px 14px', minWidth: 160 }}
        aria-label={`Legenda: ${config.titulo}`}
      >
        <ConteudoLegenda config={config} overlayAlagamento={overlayAlagamento} risco={risco} comTrechos={comTrechos} />
      </div>
    );
  }

  // ── Mobile: pill colapsável. Posicionado acima do drawer (que ocupa ~3.5rem) ──
  // para não sobrepor o handle; lado esquerdo para liberar o FAB (à direita).
  return (
    <div className="legenda-pill absolute z-[1000] pointer-events-auto" style={{ left: 8, bottom: 'var(--topo-folha)' }}>
      {expandido ? (
        <button
          type="button"
          onClick={() => setExpandido(false)}
          className="superficie rounded-2xl block text-left active:scale-[0.98] transition-transform"
          style={{ padding: '10px 14px', minWidth: 160 }}
          aria-expanded
          aria-label={`Recolher legenda: ${tituloPill}`}
        >
          <ConteudoLegenda config={config} overlayAlagamento={overlayAlagamento} risco={risco} comTrechos={comTrechos} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setExpandido(true)}
          className="mapa-controle flex items-center gap-1.5 active:scale-[0.98] transition-transform"
          style={{ padding: '8px 12px', minHeight: 44, minWidth: 120 }}
          aria-expanded={false}
          aria-label={`Expandir legenda: ${tituloPill}`}
        >
          <Info size={16} className="mapa-txt-suave flex-shrink-0" />
          <span className="truncate" style={TITULO}>{tituloPill}</span>
        </button>
      )}
    </div>
  );
}
