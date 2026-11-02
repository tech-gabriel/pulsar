import { useEffect, useRef, useState } from 'react';
import { BellRing, CloudRain, TriangleAlert, X } from 'lucide-react';
import { useNotificacoesPrefs } from '../../hooks/useNotificacoesPrefs';
import { usePushSubscription } from '../../hooks/usePushSubscription';
import { useChuvaFortePrevista } from '../../hooks/useChuvaFortePrevista';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useToast } from '../../contexts/ToastContext';
import { coresParaFaixa } from '../../utils/risco';
import { PALETA } from '../../utils/paleta';
import { escolherConvite } from './convite';
import type { Area } from '../../features/cidade/areas';

// Dispensa fica só na sessão e guarda QUAL convite foi dispensado: o pessoal some até o
// próximo acesso, mas um motivo novo (favorita em risco, chuva forte prevista) volta a
// aparecer, porque é outra razão para ativar. Some de vez quando o push é ativado.
const DISPENSADO_KEY = 'pulsar-push-convite-dispensado';

function lerDispensado(): string | null {
  if (typeof window === 'undefined') return 'ssr';
  try {
    return sessionStorage.getItem(DISPENSADO_KEY);
  } catch {
    return null;
  }
}

interface Props {
  /** Subprefeituras que a pessoa acompanha (o convite só aparece com pelo menos uma). */
  favoritas: Area[];
}

/**
 * Convite para ativar as notificações push deste dispositivo (11/2026: "A com B").
 * Todo dia fala das favoritas pelo nome e promete silêncio fora do risco; quando há motivo
 * concreto (favorita em Atenção/Alerta agora, ou chuva forte prevista numa favorita) diz o
 * motivo e pede "Me avise". A permissão nativa do navegador só é pedida no clique.
 */
export default function ConvitePush({ favoritas }: Props) {
  const { prefs } = useNotificacoesPrefs();
  const push = usePushSubscription(prefs);
  const { showToast } = useToast();
  const isMobile = useIsMobile(768);
  const [dispensado, setDispensado] = useState(lerDispensado);
  const chuva = useChuvaFortePrevista(favoritas, push.estado === 'inativo');
  const convite = escolherConvite(favoritas, chuva);
  // Marca que a ativação partiu deste convite, para confirmar com um toast só
  // quando a inscrição realmente concluir (e não ao reabrir o mapa já ativo).
  const ativandoRef = useRef(false);

  useEffect(() => {
    if (!ativandoRef.current) return;
    if (push.estado === 'ativo') {
      showToast('Pronto! Você vai receber os alertas das suas subprefeituras.', 'success');
      ativandoRef.current = false;
    } else if (push.estado === 'negado') {
      showToast('As notificações ficaram bloqueadas. Você pode reativar nas configurações do navegador.', 'error');
      ativandoRef.current = false;
    }
  }, [push.estado, showToast]);

  const escondido = dispensado !== null && (convite.variante === 'pessoal' || dispensado === convite.chave);
  if (escondido || push.estado !== 'inativo') return null;

  function dispensar() {
    try {
      sessionStorage.setItem(DISPENSADO_KEY, convite.chave);
    } catch {
      /* ignora cota/cache indisponível */
    }
    setDispensado(convite.chave);
  }

  function ativar() {
    ativandoRef.current = true;
    void push.ativar();
  }

  const cor = convite.icone === 'chuva' ? PALETA.azul
    : convite.faixa ? coresParaFaixa(convite.faixa).fill : 'var(--text-accent)';
  const Icone = convite.icone === 'chuva' ? CloudRain : convite.icone === 'risco' ? TriangleAlert : BellRing;
  const rotuloBotao = push.ocupado ? 'Ativando…' : convite.botao;

  // Celular: barra acima da tab bar com o título e o porquê. O texto quebra (até duas linhas
  // cada) em vez de cortar com reticências: a barra é estreita por causa do botão de camadas.
  if (isMobile) {
    return (
      <div
        data-variante="mobile-bar"
        // Acima do handle do drawer (sempre visível em bottom-12) e da safe-area;
        // right-[4.5rem] deixa o FAB "Ver regiões" livre na direita.
        className="convite-push superficie fixed bottom-[var(--topo-folha)] left-3 right-3 z-[1200] animate-slide-up flex items-center gap-2.5 rounded-2xl pl-3 pr-1 py-2"
        role="region"
        aria-label="Ativar notificações"
      >
        <Icone size={18} style={{ color: cor }} className="flex-shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2" style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.25, color: 'var(--text-primary)' }}>{convite.tituloCurto}</p>
          <p className="line-clamp-2 mt-0.5" style={{ fontSize: 11.5, lineHeight: 1.3, color: 'var(--text-secondary)' }}>{convite.textoCurto}</p>
        </div>
        <button
          type="button"
          onClick={ativar}
          disabled={push.ocupado}
          className="btn-gradient rounded-lg px-3 min-h-11 inline-flex items-center text-xs font-semibold flex-shrink-0"
        >
          {convite.variante === 'pessoal' && !push.ocupado ? 'Ativar' : rotuloBotao}
        </button>
        <button
          type="button"
          onClick={dispensar}
          aria-label="Dispensar"
          className="flex-shrink-0 min-w-11 min-h-11 inline-flex items-center justify-center"
          style={{ color: 'var(--text-secondary)' }}
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="cartao-pe-mapa animate-slide-up">
      <div className="superficie flex items-start gap-3 rounded-2xl px-4 py-3.5" role="region" aria-label="Ativar notificações">
        <div
          className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0"
          style={{ background: `color-mix(in srgb, ${cor} 14%, transparent)` }}
        >
          <Icone size={20} style={{ color: cor }} aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{convite.titulo}</p>
          <p className="mt-0.5" style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.45 }}>{convite.texto}</p>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={ativar}
              disabled={push.ocupado}
              className="btn-gradient rounded-lg px-4 py-2 min-h-[40px] text-xs font-semibold"
            >
              {rotuloBotao}
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
