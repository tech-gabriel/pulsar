import type { Camada } from '../../utils/camadas';
import { PALETA, comAlfa } from '../../utils/paleta';
import MiniIconeOcorrencia from './MiniIconeOcorrencia';

// ── Legenda dinâmica do mapa (ETAPA 6.1/6.3) ───────────────────────────────────
// O conteúdo (título, barra de gradiente e labels) muda conforme a camada ativa. Aparece dentro
// do seletor de camadas (LayerControl), não sobre o mapa.

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
    // O semáforo da Defesa Civil SP, em degradê (escolha de 16/11/2026).
    gradiente: gradiente(PALETA.riscoVerde, PALETA.riscoAmarelo, PALETA.riscoVermelho),
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
  fontSize: 11,
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
  /** Overlay de alagamentos ligado: acrescenta a chave das ocorrências. */
  overlayAlagamento?: boolean;
}

/** Conteúdo interno (título + barra + labels). A key força o fade ao trocar a camada. */
function ConteudoLegenda({ config, overlayAlagamento }: { config: LegendaConfig; overlayAlagamento: boolean }) {
  return (
    <div key={config.titulo} className="legend-fade">
      <p style={{ ...TITULO, marginBottom: 6 }}>{config.titulo}</p>
      <div style={{ height: 8, borderRadius: 4, background: config.gradiente }} />
      <div className="flex justify-between" style={{ marginTop: 4 }}>
        {config.labels.map((l) => (
          <span key={l} style={LABEL}>{l}</span>
        ))}
      </div>

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

/**
 * A legenda da camada ativa, sem posição própria. Mora no seletor de camadas (escolha de 16/11/2026):
 * aparece só quando a pessoa está escolhendo o que ver, como no Google Maps e no Apple Maps, e não
 * fica parada sobre o mapa.
 */
export default function MapLegend({ camadaAtiva, overlayAlagamento = false }: Props) {
  const config = LEGENDAS[camadaAtiva];
  return (
    <div style={{ padding: "10px 14px", minWidth: 160 }} aria-label={`Legenda: ${config.titulo}`}>
      <ConteudoLegenda config={config} overlayAlagamento={overlayAlagamento} />
    </div>
  );
}

// Cartão "Como ler" do computador (escolha de 16/11/2026, opção C): abre pelo botão "i" da pílula
// de camadas e explica a camada ativa. No risco, a barra marca onde muda a faixa e dá o nome dela.
const COMO_LER: Record<Camada, { titulo: string; texto: string }> = {
  score: { titulo: 'Como ler o risco', texto: 'Número de 0 a 100 em cada região, com as cores da Defesa Civil.' },
  temperatura: { titulo: 'Como ler a temperatura', texto: 'Temperatura agora em cada região, em °C.' },
  chuva: { titulo: 'Como ler a chuva', texto: 'Chuva agora em cada região, em milímetros por hora.' },
  vento: { titulo: 'Como ler o vento', texto: 'Vento agora em cada região, em km/h.' },
};

/** Divisões das faixas do risco (ClassificacaoRisco no backend: até 30, até 60, acima). */
const CORTES_RISCO = [30, 60];

export function CartaoComoLer({ camadaAtiva, overlayAlagamento = false }: Props) {
  const config = LEGENDAS[camadaAtiva];
  const texto = COMO_LER[camadaAtiva];
  const risco = camadaAtiva === 'score';
  const marca = (pct: number): React.CSSProperties => ({ position: 'absolute', left: `${pct}%`, translate: '-50% 0' });
  return (
    <div key={camadaAtiva} className="legend-fade">
      <p style={{ font: '700 14px var(--font-heading)', color: 'var(--text-primary)', margin: 0 }}>{texto.titulo}</p>
      <p style={{ font: '400 12.5px/1.4 var(--font-body)', color: 'var(--text-secondary)', margin: '2px 0 10px' }}>{texto.texto}</p>
      <div style={{ position: 'relative', height: 8, borderRadius: 4, background: config.gradiente }}>
        {risco && CORTES_RISCO.map((c) => (
          <i key={c} aria-hidden="true" style={{ position: 'absolute', left: `${c}%`, top: -2, bottom: -2, width: 2, background: 'var(--superficie)' }} />
        ))}
      </div>
      {risco ? (
        <>
          <div style={{ position: 'relative', height: 15, marginTop: 4, ...LABEL, color: 'var(--text-secondary)' }}>
            <span style={{ position: 'absolute', left: 0 }}>0</span>
            {CORTES_RISCO.map((c) => <span key={c} style={marca(c)}>{c}</span>)}
            <span style={{ position: 'absolute', right: 0 }}>100</span>
          </div>
          <div style={{ position: 'relative', height: 17, marginTop: 5, font: '500 11.5px var(--font-body)', color: 'var(--text-secondary)' }}>
            <span style={{ position: 'absolute', left: 0 }}>Tranquilo</span>
            <span style={marca(45)}>Atenção</span>
            <span style={{ position: 'absolute', right: 0 }}>Alerta</span>
          </div>
        </>
      ) : (
        <div className="flex justify-between" style={{ marginTop: 4, ...LABEL, color: 'var(--text-secondary)' }}>
          {config.labels.map((l) => <span key={l}>{l}</span>)}
        </div>
      )}
      {overlayAlagamento && (
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border-glass)' }}>
          <p style={{ font: '600 12.5px var(--font-body)', color: 'var(--text-primary)', margin: '0 0 6px' }}>Alagamentos dos últimos 12 meses</p>
          <div className="flex flex-col" style={{ gap: 4 }}>
            {ITENS_ALAGAMENTO.map(({ tipo, rotulo }) => (
              <div key={rotulo} className="flex items-center" style={{ gap: 6 }}>
                <span className="flex-shrink-0 inline-flex"><MiniIconeOcorrencia tipo={tipo} lado={16} /></span>
                <span style={{ font: '500 12px var(--font-body)', color: 'var(--text-secondary)' }}>{rotulo}</span>
              </div>
            ))}
            <p style={{ font: '400 12px var(--font-body)', color: 'var(--text-secondary)', margin: '2px 0 0' }}>Número na bola = ocorrências agrupadas</p>
          </div>
        </div>
      )}
    </div>
  );
}
