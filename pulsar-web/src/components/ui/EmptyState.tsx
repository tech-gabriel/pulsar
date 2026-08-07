import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import GlassCard from './GlassCard';
import LottieAnimacao, { type NomeAnimacao } from './LottieAnimacao';

interface Props {
  /** Ícone ilustrativo do estado vazio. Vira fallback quando há `animacao`. */
  Icon: LucideIcon;
  /** Anima a ilustração no lugar do ícone estático (carregada sob demanda). */
  animacao?: NomeAnimacao;
  /** Título curto opcional (ex.: "Histórico insuficiente"). */
  titulo?: string;
  /** Mensagem amigável explicando o vazio. */
  mensagem: string;
  /** Ação opcional (ex.: um botão para criar/atualizar). */
  acao?: ReactNode;
  /** Envolve o conteúdo num GlassCard (padrão). Use `card={false}` quando já
   *  estiver dentro de um card. */
  card?: boolean;
  className?: string;
}

/**
 * Estado vazio padronizado: ícone + mensagem (e título/ação opcionais).
 * Centraliza o visual que antes era reescrito tela a tela.
 */
export default function EmptyState({ Icon, animacao, titulo, mensagem, acao, card = true, className = '' }: Props) {
  const icone = <Icon size={44} style={{ color: 'var(--text-muted)' }} />;

  const conteudo = (
    <div className={`flex flex-col items-center text-center ${card ? '' : 'py-10'} ${className}`}>
      {animacao ? <LottieAnimacao nome={animacao} tamanho={96} fallback={icone} /> : icone}
      {titulo && (
        <p className="mt-3" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>
          {titulo}
        </p>
      )}
      <p className={titulo ? 'mt-1' : 'mt-3'} style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 380 }}>
        {mensagem}
      </p>
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );

  if (!card) return conteudo;
  return (
    <GlassCard hover={false} padding="lg" className="!py-12">
      {conteudo}
    </GlassCard>
  );
}
