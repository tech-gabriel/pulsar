import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft, Thermometer, CloudRain, Wind, Eye, Droplets, Sun, ShieldAlert, History, Bell, BellRing,
} from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp';
import { useNotificacoesPrefs } from '../../hooks/useNotificacoesPrefs';
import { usePushSubscription } from '../../hooks/usePushSubscription';
import { coresParaFaixa, labelFaixa } from '../../utils/risco';
import { useCatalogoDicas } from '../../hooks/useCatalogoDicas';
import { blocosDeDicas } from '../../utils/dicas';
import { DURACAO, EASE_SUAVE, containerStagger, itemStagger } from '../../motion/presets';
import { CIDADE_ATUAL } from '../../features/cidade/cidade';
import type { Area } from '../../features/cidade/areas';
import type { TipoPerigo } from '../../types';
import BotaoCompartilhar from '../../features/compartilhar/BotaoCompartilhar';
import BotaoFavorito from './BotaoFavorito';
import PrevisaoFaixa from './PrevisaoFaixa';
import LinhasPerigo from './LinhasPerigo';

// ── Ring de progresso circular (ETAPA 4.3) ─────────────────────────────────────
const RING_DIAMETRO = 80;
const RING_STROKE = 4;
const RING_RAIO = (RING_DIAMETRO - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_RAIO;

/**
 * Anel de score. O número assume a cor da faixa, igual ao anel: branco fixo
 * fazia o valor mais destacado do painel ser o único que não comunicava risco
 * pela cor, e destoava dos demais scores do app. `corEscura` é a variante da
 * mesma faixa para fundo claro (o branco também sumiria no tema light).
 */
function ScoreRing({ score, cor, corEscura }: { score: number; cor: string; corEscura: string }) {
  const animado = useCountUp(score, 800);
  const offset = RING_CIRC * (1 - Math.min(animado, 100) / 100);
  const centro = RING_DIAMETRO / 2;

  return (
    <div className="relative" style={{ width: RING_DIAMETRO, height: RING_DIAMETRO }}>
      <svg width={RING_DIAMETRO} height={RING_DIAMETRO} className="-rotate-90">
        <circle
          cx={centro} cy={centro} r={RING_RAIO}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={RING_STROKE}
        />
        <circle
          cx={centro} cy={centro} r={RING_RAIO}
          fill="none" stroke={cor} strokeWidth={RING_STROKE} strokeLinecap="round"
          strokeDasharray={RING_CIRC} strokeDashoffset={offset}
        />
      </svg>
      <span
        className="score-ring-valor absolute inset-0 flex items-center justify-center"
        style={{ '--c': cor, '--c-escura': corEscura, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 28 } as React.CSSProperties}
      >
        {Math.round(animado)}
      </span>
    </div>
  );
}

function LinhaClima({
  icon: Icon, corIcone, label, valor, unidade,
}: {
  icon: React.ElementType; corIcone: string; label: string; valor: string; unidade: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[rgba(0,188,255,0.06)] last:border-0">
      <div className="flex items-center gap-2.5">
        <Icon size={18} style={{ color: corIcone }} className="flex-shrink-0" />
        <span className="text-pulsar-200" style={{ fontFamily: 'var(--font-body)', fontSize: 13 }}>
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-pulsar-50" style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 14 }}>
          {valor}
        </span>
        {unidade && <span className="text-pulsar-300" style={{ fontSize: 12 }}>{unidade}</span>}
      </div>
    </div>
  );
}

const PERIGO: Record<TipoPerigo, { nome: string; Icon: React.ElementType }> = {
  ALAGAMENTO: { nome: 'Alagamento', Icon: CloudRain },
  VENTO: { nome: 'Vento', Icon: Wind },
  CALOR: { nome: 'Calor', Icon: Thermometer },
};


interface Props {
  area: Area;
  isFavorito: (subprefeituraId: string) => boolean;
  onToggleFavorito: (subprefeituraId: string) => void;
  onFechar: () => void;
}

/**
 * Detalhe de UMA subprefeitura (substitui o detalhe da zona): risco, perigo, clima atual,
 * previsão própria, sugestões, favoritar, histórico e alerta.
 */
export default function DetalheSubprefeitura({ area, isFavorito, onToggleFavorito, onFechar }: Props) {
  const navigate = useNavigate();
  const { prefs } = useNotificacoesPrefs();
  const push = usePushSubscription(prefs);
  const cores = coresParaFaixa(area.faixaRisco);
  const score = area.scoreAtual?.valor ?? 0;
  const l = area.ultimaLeitura;
  const catalogo = useCatalogoDicas();
  const blocos = blocosDeDicas(area.scoreAtual, catalogo);
  const alertaLigado = push.estado === 'ativo';

  return (
    <motion.div
      className="painel-glass flex flex-col h-full overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DURACAO.media, ease: EASE_SUAVE }}
    >
      <div className="px-4 pt-4 pb-3 flex items-start gap-2 flex-shrink-0">
        <button type="button" onClick={onFechar} aria-label="Voltar"
          className="flex items-center justify-center w-11 h-11 -m-2 rounded-xl flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="truncate" style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 24, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
            {area.nome}
          </h2>
          <p className="truncate" style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Zona {area.zona} · {CIDADE_ATUAL.nome}</p>
        </div>
        <BotaoFavorito ativo={isFavorito(area.id)} onToggle={() => onToggleFavorito(area.id)} size={20} />
      </div>

      <div className="painel-scroll flex-1 overflow-y-auto overscroll-contain px-4 pb-6" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        <motion.div variants={containerStagger} initial="inicial" animate="animar">
          <motion.div variants={itemStagger} className="flex items-center gap-4 py-3">
            <ScoreRing score={score} cor={cores.fill} corEscura={cores.text} />
            <div className="min-w-0">
              <span className="inline-block rounded-full px-3 py-1" style={{ background: cores.bg, color: cores.text, fontWeight: 600, fontSize: 13 }}>
                {labelFaixa(area.faixaRisco)}
              </span>
              <div className="mt-2"><LinhasPerigo score={area.scoreAtual} leitura={l} /></div>
            </div>
          </motion.div>

          {l && (
            <motion.div variants={itemStagger} className="painel-card-glass px-4 py-1 rounded-[10px]">
              <LinhaClima icon={Thermometer} corIcone="var(--color-pulsar-400)" label="Temperatura" valor={l.temperaturaC.toFixed(1)} unidade="°C" />
              <LinhaClima icon={Thermometer} corIcone="var(--color-pulsar-400)" label="Sensação" valor={l.sensacaoTermica.toFixed(1)} unidade="°C" />
              <LinhaClima icon={CloudRain} corIcone="#3B82F6" label="Chuva" valor={l.chuvaMmH.toFixed(1)} unidade="mm/h" />
              <LinhaClima icon={Wind} corIcone="#94A3B8" label="Vento" valor={l.ventoKmH.toFixed(1)} unidade="km/h" />
              <LinhaClima icon={Eye} corIcone="#F59E0B" label="Visibilidade" valor={l.visibilidadeKm.toFixed(1)} unidade="km" />
              <LinhaClima icon={Droplets} corIcone="#06B6D4" label="Umidade" valor={Math.round(l.umidade).toString()} unidade="%" />
              <LinhaClima icon={Sun} corIcone="#EAB308" label="Índice UV" valor={Math.round(l.indiceUv).toString()} unidade="" />
            </motion.div>
          )}

          {/* Previsão da PRÓPRIA subprefeitura; some sozinha sem faixas. */}
          <motion.div variants={itemStagger}>
            <PrevisaoFaixa subprefeituraId={area.id} />
          </motion.div>

          {blocos.length > 0 && (
            <motion.div variants={itemStagger} className="mt-4">
              <div className="flex items-center gap-1.5 mb-2">
                <ShieldAlert size={15} className="text-red-400" />
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Como se proteger</h3>
              </div>
              {blocos.map(({ perigo, faixa, dicas }) => {
                const { nome, Icon } = PERIGO[perigo];
                return (
                  <div key={perigo} className="mb-3">
                    <h4 className="flex items-center gap-1.5 mb-1.5" style={{ fontSize: 12.5, fontWeight: 600, color: coresParaFaixa(faixa).text }}>
                      <Icon size={14} aria-hidden="true" />{`${nome} · ${labelFaixa(faixa)}`}
                    </h4>
                    {dicas.map((d) => (
                      <div key={d.id} className="sugestao-card">
                        <p className="font-semibold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{d.titulo}</p>
                        <p style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--text-secondary)' }}>{d.descricao}</p>
                      </div>
                    ))}
                  </div>
                );
              })}
            </motion.div>
          )}

          <motion.p variants={itemStagger} className="mt-3" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
            Estimativa do Pulsar. Em emergência, ligue 199 (Defesa Civil) ou 193 (Bombeiros).
          </motion.p>

          {/* Ação principal na linha inteira (não quebra o texto no painel estreito do PC);
              histórico e compartilhar dividem a linha de baixo. */}
          <motion.div variants={itemStagger} className="mt-4 grid grid-cols-2 gap-2">
            {alertaLigado ? (
              <span className="col-span-2 rounded-xl min-h-11 flex items-center justify-center gap-1.5 font-semibold" style={{ background: '#DCFCE7', color: '#166534', fontSize: 14 }}>
                <BellRing size={16} /> Alertas ligados
              </span>
            ) : (
              <button type="button" className="col-span-2 rounded-xl min-h-11 flex items-center justify-center gap-1.5 font-semibold"
                style={{ background: 'var(--color-pulsar-600)', color: '#fff', fontSize: 14 }} onClick={() => navigate('/app/boas-vindas')}>
                <Bell size={16} /> Ativar alertas
              </button>
            )}
            <button type="button" className="rounded-xl min-h-11 flex items-center justify-center gap-1.5 font-semibold"
              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13 }}
              onClick={() => navigate(`/app/historico/${area.id}`, { state: { subNome: area.nome, zona: area.zona } })}>
              <History size={15} /> Histórico
            </button>
            <BotaoCompartilhar area={area} />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
