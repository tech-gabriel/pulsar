import type { PainelEstatisticas } from '../../data/regiao-view';
import { labelFaixa } from '../../utils/risco';

/** Abaixo disso a série tem buraco demais para virar número público. */
export const DIAS_MINIMOS = 60;

const mm = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mm`;
// Datas "AAAA-MM-DD" por fatia de string, sem Date: evita deslocamento de fuso.
const diaMes = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;

interface Props {
  estatisticas: PainelEstatisticas | null;
  escopo: 'zona' | 'subprefeitura';
}

/**
 * Números do rollup na página pública. Acende sozinho quando a janela tem
 * DIAS_MINIMOS dias completos; some se a coleta tiver buraco.
 */
export default function BlocoEstatisticas({ estatisticas: e, escopo }: Props) {
  if (!e || e.diasCompletos < DIAS_MINIMOS) return null;
  const zona = escopo === 'zona';

  return (
    <section className="mt-8" aria-label="Panorama recente">
      {/* 2 colunas em toda largura: o número do landing-stat é grande e vaza em 4 colunas. */}
      <div className="grid grid-cols-2 gap-4">
        <div className="landing-stat">
          <div className="landing-stat-num">{e.diasAlerta}</div>
          <div className="landing-stat-label">dias em Alerta</div>
          <div className="landing-stat-sub">nos últimos {e.janelaDias} dias</div>
        </div>
        <div className="landing-stat">
          <div className="landing-stat-num">{mm(e.chuvaTotalMm)}</div>
          <div className="landing-stat-label">chuva acumulada estimada</div>
          <div className="landing-stat-sub">{zona ? 'média por subprefeitura' : 'no período'}</div>
        </div>
        <div className="landing-stat">
          <div className="landing-stat-num">{labelFaixa(e.faixaPredominante)}</div>
          <div className="landing-stat-label">nível de risco predominante</div>
          <div className="landing-stat-sub">na janela recente</div>
        </div>
        <div className="landing-stat">
          <div className="landing-stat-num">{e.diaMaisChuvoso ? mm(e.diaMaisChuvoso.mm) : 'Sem chuva'}</div>
          <div className="landing-stat-label">dia mais chuvoso</div>
          <div className="landing-stat-sub">
            {e.diaMaisChuvoso
              ? `em ${diaMes(e.diaMaisChuvoso.dia)}${zona ? ', em uma das subprefeituras' : ''}`
              : 'no período'}
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        Estimativa do Pulsar nos últimos {e.janelaDias} dias, atualizada em {diaMes(e.atualizadoEm)}/{e.atualizadoEm.slice(0, 4)}.
      </p>
    </section>
  );
}
