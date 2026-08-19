import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Thermometer, CloudRain, Wind, Eye, Droplets, Sun,
  ShieldAlert, History, RefreshCw, ChevronDown,
} from 'lucide-react';
import type { SubprefeituraDto, LeituraDto } from '../../types';
import { useRegiaoDetalhe } from '../../hooks/useRegiaoDetalhe';
import { useCountUp } from '../../hooks/useCountUp';
import { coresParaFaixa, labelFaixa } from '../../utils/risco';
import { fundoParaTextoBranco } from '../../utils/contraste';
import { centroideRegiao } from '../../utils/geo';
import { gerarSugestoes, type CategoriaSugestao } from '../../utils/sugestoes';
import { DURACAO, EASE_SUAVE, containerStagger, itemStagger } from '../../motion/presets';
import BotaoFavorito from './BotaoFavorito';
import PrevisaoFaixa from './PrevisaoFaixa';
import { SkeletonCardSubprefeitura } from '../ui/Skeleton';

interface Props {
  regiaoId: string;
  onFechar: () => void;
  isFavorito: boolean;
  onToggleFavorito: () => void;
}

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

// ── Agregação das condições climáticas da região ───────────────────────────────
interface ClimaRegiao {
  temperatura: number;
  sensacao: number;
  chuva: number;
  vento: number;
  visibilidade: number;
  umidade: number;
  uv: number;
}

function agregarClima(subs: SubprefeituraDto[]): ClimaRegiao | null {
  const leituras = subs.map((s) => s.ultimaLeitura).filter((l): l is LeituraDto => l != null);
  if (leituras.length === 0) return null;
  const n = leituras.length;
  const media = (sel: (l: LeituraDto) => number) => leituras.reduce((a, l) => a + sel(l), 0) / n;
  return {
    temperatura: media((l) => l.temperaturaC),
    sensacao: media((l) => l.sensacaoTermica),
    chuva: Math.max(...leituras.map((l) => l.chuvaMmH)),
    vento: Math.max(...leituras.map((l) => l.ventoKmH)),
    visibilidade: Math.min(...leituras.map((l) => l.visibilidadeKm)),
    umidade: media((l) => l.umidade),
    uv: Math.max(...leituras.map((l) => l.indiceUv)),
  };
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

// ── Item de subprefeitura: expande para a visão micro (clima da subprefeitura) ──
function ItemSubprefeitura({ sub, indice, onVerHistorico }: {
  sub: SubprefeituraDto; indice: number; onVerHistorico: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const score = sub.scoreAtual?.valor ?? 0;
  const cores = coresParaFaixa(sub.faixaRisco);
  const temp = sub.temperaturaAtual ?? sub.ultimaLeitura?.temperaturaC;
  const l = sub.ultimaLeitura;

  return (
    <div className="py-2">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="w-full text-left"
        aria-expanded={aberto}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-pulsar-50 truncate flex items-center gap-1.5" style={{ fontFamily: 'var(--font-body)', fontSize: 13 }}>
            <ChevronDown
              size={13}
              className="flex-shrink-0 text-pulsar-300 transition-transform"
              style={{ transform: aberto ? 'rotate(180deg)' : 'none' }}
            />
            <span className="truncate">{sub.nome}</span>
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            {temp != null && (
              <span className="text-pulsar-300" style={{ fontSize: 11 }}>{Math.round(temp)}°C</span>
            )}
            <span
              className="rounded-full px-2 py-0.5"
              style={{ background: fundoParaTextoBranco(cores.fill), color: '#FFFFFF', fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 12 }}
            >
              {score.toFixed(0)}
            </span>
          </div>
        </div>

        {/* Barra de progresso animada (delay escalonado por índice) */}
        <div className="mt-1.5 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full rounded-full barra-progresso"
            style={{
              width: `${Math.min(score, 100)}%`,
              background: cores.fill,
              animationDelay: `${indice * 50}ms`,
            }}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {aberto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DURACAO.media, ease: EASE_SUAVE }}
            style={{ overflow: 'hidden' }}
          >
            <span className="block pt-1 pb-0.5 text-[11px] uppercase tracking-wider text-pulsar-300/70" style={{ fontWeight: 600 }}>
              Risco {labelFaixa(sub.faixaRisco)}
            </span>
            {l ? (
              <div className="mt-1 painel-card-glass px-3 py-1 rounded-[10px]">
                <LinhaClima icon={Thermometer} corIcone="var(--color-pulsar-400)" label="Temperatura" valor={l.temperaturaC.toFixed(1)} unidade="°C" />
                <LinhaClima icon={Thermometer} corIcone="var(--color-pulsar-400)" label="Sensação" valor={l.sensacaoTermica.toFixed(1)} unidade="°C" />
                <LinhaClima icon={CloudRain} corIcone="#3B82F6" label="Chuva" valor={l.chuvaMmH.toFixed(1)} unidade="mm/h" />
                <LinhaClima icon={Wind} corIcone="#94A3B8" label="Vento" valor={l.ventoKmH.toFixed(1)} unidade="km/h" />
                <LinhaClima icon={Eye} corIcone="#F59E0B" label="Visibilidade" valor={l.visibilidadeKm.toFixed(1)} unidade="km" />
                <LinhaClima icon={Droplets} corIcone="#06B6D4" label="Umidade" valor={Math.round(l.umidade).toString()} unidade="%" />
                <LinhaClima icon={Sun} corIcone="#EAB308" label="Índice UV" valor={Math.round(l.indiceUv).toString()} unidade="" />
              </div>
            ) : (
              <p className="mt-1 text-xs text-pulsar-300 py-1">Sem leitura recente para esta subprefeitura.</p>
            )}

            <button
              type="button"
              onClick={onVerHistorico}
              className="mt-2 flex items-center gap-1.5 text-xs text-pulsar-300 hover:text-pulsar-100 font-medium transition-colors"
            >
              <History size={12} />
              Ver histórico (24h)
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const ICONE_CATEGORIA: Record<CategoriaSugestao, React.ElementType> = {
  chuva: CloudRain,
  vento: Wind,
  visibilidade: Eye,
  uv: Sun,
};

export default function DetalheRegiao({ regiaoId, onFechar, isFavorito, onToggleFavorito }: Props) {
  const navigate = useNavigate();
  const { regiao, carregando, erro } = useRegiaoDetalhe(regiaoId);

  const subsOrdenadas = regiao
    ? [...regiao.subprefeituras].sort((a, b) => (b.scoreAtual?.valor ?? 0) - (a.scoreAtual?.valor ?? 0))
    : [];
  const clima = regiao ? agregarClima(regiao.subprefeituras) : null;
  const centro = regiao ? centroideRegiao(regiao.subprefeituras) : null;
  const cores = regiao ? coresParaFaixa(regiao.faixaRisco) : null;
  const score = regiao?.scoreAgregado ?? 0;
  const sugestoes = regiao ? gerarSugestoes(regiao.subprefeituras) : [];

  return (
    <motion.div
      className="painel-glass flex flex-col h-full overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DURACAO.media, ease: EASE_SUAVE }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-2 flex-shrink-0">
        <button
          onClick={onFechar}
          className="text-pulsar-300 hover:text-white transition-colors mt-0.5 flex-shrink-0"
          title="Voltar"
          aria-label="Voltar para a lista"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-pulsar-50 truncate" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 18 }}>
            {regiao?.nome ?? 'Carregando…'}
          </h2>
          {centro && (
            <p className="text-pulsar-300 truncate" style={{ fontFamily: 'var(--font-mono)', fontWeight: 400, fontSize: 11 }}>
              lat {centro.lat.toFixed(2)}, lon {centro.lon.toFixed(2)}
            </p>
          )}
        </div>
        <BotaoFavorito ativo={isFavorito} onToggle={onToggleFavorito} size={18} />
      </div>

      {/* Body */}
      <div className="painel-scroll flex-1 overflow-y-auto overscroll-contain px-4 pb-6" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {carregando && (
          <div className="pt-2">
            <SkeletonCardSubprefeitura />
            <SkeletonCardSubprefeitura />
            <SkeletonCardSubprefeitura />
          </div>
        )}

        {!carregando && erro && (
          <div className="py-8 flex flex-col items-center gap-3 text-center">
            <RefreshCw size={24} className="text-pulsar-700" />
            <p className="text-sm text-pulsar-200">{erro}</p>
            <button onClick={() => window.location.reload()} className="text-xs text-pulsar-300 hover:underline font-medium">
              Tentar novamente
            </button>
          </div>
        )}

        {regiao && cores && (
          <motion.div variants={containerStagger} initial="inicial" animate="animar">
            {/* Score em destaque com ring */}
            <motion.div variants={itemStagger} className="flex flex-col items-center py-4">
              <ScoreRing score={score} cor={cores.fill} corEscura={cores.text} />
              <span className="mt-2 text-pulsar-100" style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 13 }}>
                Risco {labelFaixa(regiao.faixaRisco)}
              </span>
            </motion.div>

            {/* Grid de variáveis climáticas */}
            {clima && (
              <motion.div variants={itemStagger} className="painel-card-glass px-4 py-1 rounded-[10px]">
                <LinhaClima icon={Thermometer} corIcone="var(--color-pulsar-400)" label="Temperatura" valor={clima.temperatura.toFixed(1)} unidade="°C" />
                <LinhaClima icon={Thermometer} corIcone="var(--color-pulsar-400)" label="Sensação" valor={clima.sensacao.toFixed(1)} unidade="°C" />
                <LinhaClima icon={CloudRain} corIcone="#3B82F6" label="Chuva" valor={clima.chuva.toFixed(1)} unidade="mm/h" />
                <LinhaClima icon={Wind} corIcone="#94A3B8" label="Vento" valor={clima.vento.toFixed(1)} unidade="km/h" />
                <LinhaClima icon={Eye} corIcone="#F59E0B" label="Visibilidade" valor={clima.visibilidade.toFixed(1)} unidade="km" />
                <LinhaClima icon={Droplets} corIcone="#06B6D4" label="Umidade" valor={Math.round(clima.umidade).toString()} unidade="%" />
                <LinhaClima icon={Sun} corIcone="#EAB308" label="Índice UV" valor={Math.round(clima.uv).toString()} unidade="" />
              </motion.div>
            )}

            {/* Previsão das próximas horas. Fica entre o clima atual e as sugestões
                porque a narrativa do painel é: agora, próximas horas, o que fazer.
                Sem guarda aqui de propósito: o componente busca sozinho e devolve
                null quando não há faixa, então um wrapper condicional só duplicaria
                a decisão em dois lugares. */}
            <motion.div variants={itemStagger}>
              <PrevisaoFaixa regiaoId={regiao.id} />
            </motion.div>

            {/* Sugestões de segurança / atenção */}
            {score > 60 && sugestoes.length > 0 && (
              <motion.div variants={itemStagger} className="mt-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <ShieldAlert size={15} className="text-red-400" />
                  <h3 className="text-pulsar-100" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 14 }}>
                    Sugestões de Segurança
                  </h3>
                </div>
                {sugestoes.map((s, i) => {
                  const Icon = ICONE_CATEGORIA[s.categoria];
                  return (
                    <div key={i} className="sugestao-card flex gap-2.5">
                      <Icon size={16} className="text-red-300 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-pulsar-50 font-semibold" style={{ fontSize: 13 }}>{s.titulo}</p>
                        <p className="text-pulsar-200" style={{ fontSize: 12, lineHeight: 1.45 }}>{s.descricao}</p>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}

            {score > 30 && score <= 60 && (
              <motion.div variants={itemStagger} className="mt-4 px-3 py-2.5 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
                <p className="text-yellow-200" style={{ fontSize: 12.5 }}>
                  <span className="font-semibold">Atenção:</span> condições moderadas. Acompanhe a evolução do tempo.
                </p>
              </motion.div>
            )}

            {/* Lista de subprefeituras */}
            <motion.div variants={itemStagger} className="mt-4">
              <h3 className="text-pulsar-200 mb-1" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 14 }}>
                Subprefeituras
              </h3>
              {subsOrdenadas.length === 0 ? (
                <p className="text-sm text-pulsar-300 py-2">Ainda não temos dados para esta região.</p>
              ) : (
                <div className="divide-y divide-[rgba(0,188,255,0.06)]">
                  {subsOrdenadas.map((sub, i) => (
                    <ItemSubprefeitura
                      key={sub.id}
                      sub={sub}
                      indice={i}
                      onVerHistorico={() =>
                        navigate(`/app/historico/${sub.id}`, { state: { regiaoNome: regiao.nome, subNome: sub.nome } })
                      }
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
