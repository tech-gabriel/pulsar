import type { TipoMudanca } from '../../data/changelog';

/**
 * Selo colorido por tipo de mudança, no padrão dos chips do app
 * (fundo/borda suaves na cor + texto na cor). As cores seguem as usadas
 * no design system: cyan de destaque, azul e âmbar.
 */
const META: Record<TipoMudanca, { rotulo: string; cor: string }> = {
  novo: { rotulo: 'NOVO', cor: '#00BCFF' },
  melhoria: { rotulo: 'MELHORIA', cor: '#3b82f6' },
  correcao: { rotulo: 'CORREÇÃO', cor: '#f59e0b' },
};

export default function TagMudanca({ tipo }: { tipo: TipoMudanca }) {
  const { rotulo, cor } = META[tipo];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5"
      style={{
        background: `${cor}1f`,
        border: `1px solid ${cor}44`,
        color: cor,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: 0.4,
      }}
    >
      {rotulo}
    </span>
  );
}
