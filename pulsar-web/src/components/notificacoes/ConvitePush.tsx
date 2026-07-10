import { useEffect, useRef, useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { useNotificacoesPrefs } from '../../hooks/useNotificacoesPrefs';
import { usePushSubscription } from '../../hooks/usePushSubscription';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useToast } from '../../contexts/ToastContext';

// Dispensa fica só na sessão: ao clicar "Agora não" o convite some, mas volta no
// próximo acesso (sessionStorage zera ao fechar a aba/novo login). Some de vez
// apenas quando o push é ativado — aí o estado nunca mais é 'inativo'.
const DISPENSADO_KEY = 'pulsar-push-convite-dispensado';

function lerDispensado(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return sessionStorage.getItem(DISPENSADO_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Convite proativo (banner discreto) para ativar as notificações push deste
 * dispositivo. Só aparece quando o push é suportado e ainda não foi ativado
 * (`estado === 'inativo'`) e a pessoa não dispensou nesta sessão. A permissão
 * nativa do navegador só é pedida quando ela clica em "Ativar".
 */
export default function ConvitePush() {
  const { prefs } = useNotificacoesPrefs();
  const push = usePushSubscription(prefs);
  const { showToast } = useToast();
  const isMobile = useIsMobile(768);
  const [dispensado, setDispensado] = useState(lerDispensado);
  // Marca que a ativação partiu deste banner, para confirmar com um toast só
  // quando a inscrição realmente concluir (e não ao reabrir o mapa já ativo).
  const ativandoRef = useRef(false);

  useEffect(() => {
    if (!ativandoRef.current) return;
    if (push.estado === 'ativo') {
      showToast('Pronto! Você vai receber os alertas das suas regiões.', 'success');
      ativandoRef.current = false;
    } else if (push.estado === 'negado') {
      showToast('As notificações ficaram bloqueadas. Você pode reativar nas configurações do navegador.', 'error');
      ativandoRef.current = false;
    }
  }, [push.estado, showToast]);

  if (dispensado || push.estado !== 'inativo') return null;

  function dispensar() {
    try {
      sessionStorage.setItem(DISPENSADO_KEY, '1');
    } catch {
      /* ignora cota/cache indisponível */
    }
    setDispensado(true);
  }

  function ativar() {
    ativandoRef.current = true;
    void push.ativar();
  }

  // Mobile: barra compacta de uma linha, ancorada acima da tab bar (não tapa o mapa).
  if (isMobile) {
    return (
      <div
        data-variante="mobile-bar"
        // Acima do handle do drawer (sempre visível em bottom-12) e da safe-area;
        // right-[4.5rem] deixa o FAB "Ver regiões" livre na direita.
        className="fixed bottom-[7.5rem] left-3 right-[4.5rem] z-[1200] animate-slide-up flex items-center gap-2.5 rounded-xl px-3 py-2"
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-glass, rgba(0,188,255,0.15))',
          boxShadow: '0 8px 28px rgba(2, 24, 38, 0.35)',
        }}
        role="region"
        aria-label="Ativar notificações"
      >
        <BellRing size={18} style={{ color: 'var(--text-accent)' }} className="flex-shrink-0" />
        <p className="min-w-0 flex-1 truncate" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          Receba alertas no celular
        </p>
        <button
          type="button"
          onClick={ativar}
          disabled={push.ocupado}
          className="btn-gradient rounded-lg px-3 py-1.5 text-xs font-semibold flex-shrink-0"
        >
          {push.ocupado ? 'Ativando…' : 'Ativar'}
        </button>
        <button
          type="button"
          onClick={dispensar}
          aria-label="Dispensar"
          className="flex-shrink-0 p-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  // Desktop/tablet: card completo (inalterado).
  return (
    <div className="absolute left-1/2 -translate-x-1/2 z-[1200] bottom-[7.5rem] md:bottom-6 w-[calc(100%-1.5rem)] max-w-md animate-slide-up">
      <div
        className="flex items-start gap-3 rounded-2xl px-4 py-3.5"
        style={{
          background: 'var(--bg-glass, rgba(5, 47, 74, 0.92))',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--border-glass, rgba(0, 188, 255, 0.15))',
          boxShadow: '0 12px 40px rgba(2, 24, 38, 0.35)',
        }}
        role="region"
        aria-label="Ativar notificações"
      >
        <div
          className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0"
          style={{ background: 'rgba(0, 188, 255, 0.12)', border: '1px solid rgba(0, 188, 255, 0.2)' }}
        >
          <BellRing size={20} style={{ color: 'var(--text-accent)' }} />
        </div>

        <div className="min-w-0 flex-1">
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            Receba alertas no celular
          </p>
          <p className="mt-0.5" style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            Avisamos assim que uma região que você acompanha entrar em risco.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={ativar}
              disabled={push.ocupado}
              className="btn-gradient rounded-lg px-4 py-2 min-h-[40px] text-xs font-semibold"
            >
              {push.ocupado ? 'Ativando…' : 'Ativar'}
            </button>
            <button
              type="button"
              onClick={dispensar}
              className="rounded-lg px-3 py-2 min-h-[40px] text-xs font-medium transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
