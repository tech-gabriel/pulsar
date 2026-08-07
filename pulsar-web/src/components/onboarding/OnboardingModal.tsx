import { useState, useEffect, type ReactNode } from 'react';
import {
  Sparkles, Map as MapIcon, MousePointerClick, Search, Star, History, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { FaixaRisco } from '../../types';
import { coresParaFaixa, labelFaixa } from '../../utils/risco';
import LottieAnimacao, { type NomeAnimacao } from '../ui/LottieAnimacao';

interface Props {
  /** Chamado ao concluir ou pular — marca o onboarding como visto. */
  onConcluir: () => void;
}

interface Passo {
  Icon: LucideIcon;
  titulo: string;
  conteudo: ReactNode;
  /** Só a tela de boas-vindas troca o ícone pela animação de marca; as demais
   *  usam ícone funcional, que é o que ajuda a entender o passo. */
  animacao?: NomeAnimacao;
}

const FAIXAS: FaixaRisco[] = ['BAIXO', 'MODERADO', 'ALTO'];

const DESCRICAO_FAIXA: Record<FaixaRisco, string> = {
  BAIXO: 'tranquilo',
  MODERADO: 'fique atento',
  ALTO: 'cuidado redobrado',
};

/** Escala de cores do risco — reaproveita as cores oficiais das faixas. */
function EscalaRisco() {
  return (
    <div className="flex flex-col gap-2 mt-1">
      {FAIXAS.map((f) => {
        const cor = coresParaFaixa(f).fill;
        return (
          <div key={f} className="flex items-center gap-2.5">
            <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: cor, boxShadow: `0 0 8px ${cor}66` }} />
            <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>{labelFaixa(f)}</span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{DESCRICAO_FAIXA[f]}</span>
          </div>
        );
      })}
    </div>
  );
}

function ItemUso({ Icon, children }: { Icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={17} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--text-accent)' }} />
      <span style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.45 }}>{children}</span>
    </div>
  );
}

const PASSOS: Passo[] = [
  {
    Icon: Sparkles,
    animacao: 'radar',
    titulo: 'Bem-vindo ao Pulsar',
    conteudo: (
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        O Pulsar acompanha as condições climáticas de São Paulo em tempo real e traduz
        tudo em um <strong style={{ color: 'var(--text-primary)' }}>score de risco</strong> por
        região, para você saber num olhar onde redobrar a atenção.
      </p>
    ),
  },
  {
    Icon: MapIcon,
    titulo: 'Entenda o mapa',
    conteudo: (
      <div>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Cada região do mapa ganha uma cor conforme o nível de risco atual:
        </p>
        <EscalaRisco />
      </div>
    ),
  },
  {
    Icon: MousePointerClick,
    titulo: 'Como usar',
    conteudo: (
      <div className="flex flex-col gap-2.5">
        <ItemUso Icon={MousePointerClick}>Toque numa região para ver o detalhe e as condições do momento.</ItemUso>
        <ItemUso Icon={Search}>Busque uma rua ou endereço para localizar a região correspondente.</ItemUso>
        <ItemUso Icon={Star}>Favorite as regiões que você acompanha de perto.</ItemUso>
        <ItemUso Icon={History}>Veja o histórico das últimas 24h de cada subprefeitura.</ItemUso>
      </div>
    ),
  },
];

export default function OnboardingModal({ onConcluir }: Props) {
  const [passo, setPasso] = useState(0);
  const ultimo = passo === PASSOS.length - 1;
  const atual = PASSOS[passo];

  // Esc fecha (conclui) o onboarding.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onConcluir();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onConcluir]);

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center px-4"
      style={{ background: 'rgba(2, 24, 38, 0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Boas-vindas ao Pulsar"
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden animate-slide-up"
        style={{
          background: 'var(--bg-glass, rgba(5, 47, 74, 0.92))',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--border-glass, rgba(0, 188, 255, 0.15))',
          boxShadow: '0 20px 60px rgba(2, 24, 38, 0.5)',
        }}
      >
        {/* Pular (canto) */}
        <button
          type="button"
          onClick={onConcluir}
          className="absolute top-3 right-3 text-pulsar-300 hover:text-white transition-colors"
          aria-label="Pular boas-vindas"
          title="Pular"
        >
          <X size={18} />
        </button>

        <div className="px-6 pt-7 pb-5">
          {/* Ícone (ou animação de marca, na tela de boas-vindas) */}
          {atual.animacao ? (
            <div className="mb-2 -mt-2 -ml-3">
              <LottieAnimacao
                nome={atual.animacao}
                tamanho={72}
                fallback={<atual.Icon size={24} style={{ color: 'var(--text-accent)' }} />}
              />
            </div>
          ) : (
            <div
              className="w-12 h-12 rounded-xl grid place-items-center mb-4"
              style={{ background: 'rgba(0, 188, 255, 0.12)', border: '1px solid rgba(0, 188, 255, 0.2)' }}
            >
              <atual.Icon size={24} style={{ color: 'var(--text-accent)' }} />
            </div>
          )}

          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 20, color: 'var(--text-primary)' }}>
            {atual.titulo}
          </h2>
          <div className="mt-2 min-h-[136px]">{atual.conteudo}</div>
        </div>

        {/* Rodapé: indicadores + navegação */}
        <div className="px-6 pb-5 flex items-center justify-between gap-3">
          {/* Dots */}
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {PASSOS.map((_, i) => (
              <span
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: i === passo ? 18 : 7,
                  height: 7,
                  background: i === passo ? 'var(--text-accent)' : 'var(--border-glass, rgba(0,188,255,0.25))',
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {passo > 0 && (
              <button
                type="button"
                onClick={() => setPasso((p) => p - 1)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-pulsar-200 hover:text-white transition-colors"
              >
                Anterior
              </button>
            )}
            <button
              type="button"
              onClick={() => (ultimo ? onConcluir() : setPasso((p) => p + 1))}
              className="btn-gradient px-4 py-2 rounded-lg text-sm font-semibold"
            >
              {ultimo ? 'Começar a usar' : 'Próximo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
