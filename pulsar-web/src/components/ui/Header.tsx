import { LogOut } from 'lucide-react';

interface Props {
  nomeUsuario?: string;
  onLogout?: () => void;
  totalSubprefeituras?: number;
}

/**
 * Header glass fixo no topo da aplicação (ETAPA 5.4).
 * Esquerda: marca PULSAR. Centro: status de monitoramento (oculto no mobile).
 * Direita: nome do usuário (oculto no mobile) + logout.
 */
export default function Header({ nomeUsuario, onLogout, totalSubprefeituras = 32 }: Props) {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-[1000] flex items-center justify-between h-12 md:h-14 px-4 md:px-6"
      style={{
        background: 'rgba(5, 47, 74, 0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-glass)',
      }}
    >
      {/* Esquerda — marca */}
      <span
        className="text-pulsar-50"
        style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 20, textShadow: '0 0 20px rgba(0, 188, 255, 0.3)' }}
      >
        PULSAR
      </span>

      {/* Centro — status (apenas desktop) */}
      <div className="hidden md:flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 dot-pulse" />
        <span className="text-pulsar-300" style={{ fontFamily: 'var(--font-body)', fontSize: 13 }}>
          Monitorando {totalSubprefeituras} subprefeituras
        </span>
      </div>

      {/* Direita — usuário + logout */}
      <div className="flex items-center gap-4">
        {nomeUsuario && (
          <span className="hidden md:inline text-pulsar-200" style={{ fontFamily: 'var(--font-body)', fontSize: 13 }}>
            {nomeUsuario}
          </span>
        )}
        {onLogout && (
          <button
            onClick={onLogout}
            className="text-pulsar-300 hover:text-pulsar-50 transition-colors"
            title="Sair"
            aria-label="Sair da conta"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </header>
  );
}
