import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft, Thermometer, CloudRain, Wind, Droplets, Sun, ShieldAlert, History, Bell, BellRing, Route,
} from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp';
import { useNotificacoesPrefs } from '../../hooks/useNotificacoesPrefs';
import { usePushSubscription } from '../../hooks/usePushSubscription';
import { usePrevisaoSubprefeitura } from '../../hooks/usePrevisaoSubprefeitura';
import { coresParaFaixa, labelFaixa } from '../../utils/risco';
import { fraseDoRisco } from '../../features/locais/estadoLugar';
import { useCatalogoDicas } from '../../hooks/useCatalogoDicas';
import { blocosDeDicas } from '../../utils/dicas';
import { DURACAO, EASE_SUAVE, containerStagger, itemStagger } from '../../motion/presets';
import { CIDADE_ATUAL, idDaArea } from '../../features/cidade/cidade';
import type { Area } from '../../features/cidade/areas';
import type { FaixaRisco, TipoPerigo } from '../../types';
import BotaoCompartilhar from '../../features/compartilhar/BotaoCompartilhar';
import BotaoFavorito from './BotaoFavorito';
import PrevisaoFaixa from './PrevisaoFaixa';
import AlagamentosCge from './AlagamentosCge';
import ChuvaMedidaLinha from './ChuvaMedidaLinha';

const decimal = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const inteiro = (v: number) => Math.round(v).toLocaleString('pt-BR');

/** Escala da OMS para o índice UV. */
function nivelUv(uv: number): string {
  if (uv < 3) return 'baixo';
  if (uv < 6) return 'moderado';
  if (uv < 8) return 'alto';
  if (uv < 11) return 'muito alto';
  return 'extremo';
}


/** Bloco de uma medida. Nomeado pelo que mede; o risco, quando existe, vem numa linha à parte. */
function Bloco({ Icon, titulo, valor, unidade, sub, risco, inteiroLargura = false }: {
  Icon: React.ElementType; titulo: string; valor: string; unidade: string; sub?: string;
  risco?: { nome: string; faixa: FaixaRisco }; inteiroLargura?: boolean;
}) {
  const cores = risco ? coresParaFaixa(risco.faixa) : null;
  return (
    <div className={inteiroLargura ? 'det-bloco det-tile inteiro' : 'det-bloco det-tile'}>
      <span className="det-tile-t"><Icon size={14} aria-hidden="true" />{titulo}</span>
      <span className="det-tile-v">{valor}<span>{unidade}</span></span>
      {sub && <span className="det-tile-s">{sub}</span>}
      {risco && cores && (
        <span className="det-tile-r" style={{ '--c': cores.fill } as React.CSSProperties}>
          {/* Só a faixa: o título do bloco já diz de que risco se trata, e o texto inteiro
              quebrava em duas linhas no bloco estreito. O leitor de tela ouve o nome. */}
          <i aria-hidden="true" /><span className="sr-only">{`Risco de ${risco.nome}: `}</span>{labelFaixa(risco.faixa)}
        </span>
      )}
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
  /** Abre a rota até aqui; sem ele o botão "Como chegar" não aparece. */
  onComoChegar?: () => void;
}

/**
 * Detalhe de UMA subprefeitura (redesenho de 11/2026): o risco grande com uma frase,
 * a chuva das próximas horas, um bloco por medida (sem repetir dado), como se proteger,
 * e as ações. Tudo é preenchimento leve dentro do painel: nada de cartão com borda nem
 * vidro sobre o vidro do painel.
 */
export default function DetalheSubprefeitura({ area, isFavorito, onToggleFavorito, onFechar, onComoChegar }: Props) {
  const navigate = useNavigate();
  const { prefs } = useNotificacoesPrefs();
  const push = usePushSubscription(prefs);
  const { faixas, erro: erroPrevisao } = usePrevisaoSubprefeitura(area.id);
  const cores = coresParaFaixa(area.faixaRisco);
  const s = area.scoreAtual;
  const c = s?.componentes;
  const l = area.ultimaLeitura;
  const animado = useCountUp(s?.valor ?? 0, 800);
  const catalogo = useCatalogoDicas();
  const blocos = blocosDeDicas(s, catalogo);
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
          {/* Risco: o número grande, a faixa e uma frase com o porquê. A cor só aqui. */}
          <motion.div variants={itemStagger} className="det-hero"
            style={{ '--c': cores.fill, '--c-escura': cores.text } as React.CSSProperties}>
            <span className="det-hero-num score-ring-valor" aria-label={`Score ${Math.round(s?.valor ?? 0)} de 100`}>
              {s ? Math.round(animado) : '–'}
            </span>
            <div className="min-w-0">
              <p className="det-hero-faixa score-ring-valor">{labelFaixa(area.faixaRisco)}</p>
              <p className="det-hero-frase">{fraseDoRisco(area, erroPrevisao ? [] : faixas)}</p>
            </div>
          </motion.div>

          {/* Dado oficial (chuva medida e alagamento) vem antes de tudo que é estimativa. */}
          <motion.div variants={itemStagger}>
            <ChuvaMedidaLinha nome={area.nome} medida={area.chuvaMedida} chuva24h={area.chuva24h} />
            <AlagamentosCge pontos={area.alagamentosCge} />
          </motion.div>

          {/* Previsão da PRÓPRIA subprefeitura; some sozinha sem faixas. */}
          <motion.div variants={itemStagger}>
            <PrevisaoFaixa faixas={faixas} erro={erroPrevisao} />
          </motion.div>

          <motion.div variants={itemStagger} className="det-tiles">
            {s && (
              <Bloco Icon={CloudRain} titulo="Chuva estimada" valor={decimal(s.chuva3hMm ?? 0)} unidade="mm"
                sub={`em 3h · 48h: ${decimal(s.chuva48hMm ?? 0)} mm`}
                risco={c ? { nome: 'alagamento', faixa: c.alagamento.faixa } : undefined} />
            )}
            {l && (
              <>
                <Bloco Icon={Wind} titulo="Vento" valor={inteiro(l.ventoKmH)} unidade="km/h"
                  risco={c ? { nome: 'vento', faixa: c.vento.faixa } : undefined} />
                <Bloco Icon={Thermometer} titulo="Temperatura" valor={decimal(l.temperaturaC)} unidade="°C"
                  sub={`sensação ${inteiro(l.sensacaoTermica)} °C`}
                  risco={c ? { nome: 'calor', faixa: c.calor.faixa } : undefined} />
                <Bloco Icon={Droplets} titulo="Umidade" valor={inteiro(l.umidade)} unidade="%"
                  sub={`visibilidade ${inteiro(l.visibilidadeKm)} km`} />
                <Bloco Icon={Sun} titulo="Índice UV" valor={inteiro(l.indiceUv)} unidade={nivelUv(l.indiceUv)} inteiroLargura
                  sub={l.indiceUv >= 8 ? 'Evite o sol entre 10h e 16h' : undefined} />
              </>
            )}
          </motion.div>

          {blocos.length > 0 && (
            <motion.div variants={itemStagger} className="det-secao">
              <div className="det-secao-cab">
                <h3 className="det-rotulo flex items-center gap-1.5"><ShieldAlert size={13} aria-hidden="true" />Como se proteger</h3>
              </div>
              {blocos.map(({ perigo, faixa, dicas }) => {
                const { nome, Icon } = PERIGO[perigo];
                return (
                  <div key={perigo} className="mb-3" style={{ '--c': coresParaFaixa(faixa).fill } as React.CSSProperties}>
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

          {/* Ação principal na linha inteira (não quebra o texto no painel estreito do PC);
              histórico e compartilhar dividem a linha de baixo. */}
          <motion.div variants={itemStagger} className="mt-5 grid grid-cols-2 gap-2">
            {alertaLigado ? (
              <span className="col-span-2 rounded-[14px] min-h-11 flex items-center justify-center gap-1.5 font-semibold" style={{ background: '#DCFCE7', color: '#166534', fontSize: 14 }}>
                <BellRing size={16} /> Alertas ligados
              </span>
            ) : (
              <button type="button" className="col-span-2 rounded-[14px] min-h-11 flex items-center justify-center gap-1.5 font-semibold"
                style={{ background: 'var(--color-pulsar-600)', color: '#fff', fontSize: 14 }} onClick={() => navigate('/app/boas-vindas')}>
                <Bell size={16} /> Ativar alertas
              </button>
            )}
            <button type="button" className="rounded-[14px] min-h-11 flex items-center justify-center gap-1.5 font-semibold"
              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13 }}
              onClick={() => navigate(`/app/historico/${idDaArea(area.nome)}`, { state: { subNome: area.nome, zona: area.zona } })}>
              <History size={15} /> Histórico
            </button>
            <BotaoCompartilhar area={area} />
            {onComoChegar && (
              <button type="button" className="col-span-2 rounded-[14px] min-h-11 flex items-center justify-center gap-1.5 font-semibold"
                style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13 }} onClick={onComoChegar}>
                <Route size={15} aria-hidden="true" /> Como chegar
              </button>
            )}
          </motion.div>

          <motion.p variants={itemStagger} className="mt-3" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
            Estimativa do Pulsar. Em emergência, ligue 199 (Defesa Civil) ou 193 (Bombeiros).
          </motion.p>
        </motion.div>
      </div>
    </motion.div>
  );
}
