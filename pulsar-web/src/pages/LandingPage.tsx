import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import LandingNav from '../components/landing/LandingNav';
import LandingBusca from '../components/landing/LandingBusca';
import LandingBento from '../components/landing/LandingBento';
import LandingPassos from '../components/landing/LandingPassos';
import LandingRegioes from '../components/landing/LandingRegioes';
import LandingFontes from '../components/landing/LandingFontes';
import LandingFaq from '../components/landing/LandingFaq';
import LandingCta from '../components/landing/LandingCta';
import LandingFooter from '../components/landing/LandingFooter';
import { useRevelarAoRolar } from '../motion/gsap';

/**
 * Landing pública do Pulsar (rota `/`). A busca de bairro abre a página; o resto
 * rola normal, sem trava de rolagem. Respeita o tema global (o `LandingNav` traz o
 * toggle). Visitante autenticado é redirecionado em `RotaLanding`.
 */
export default function LandingPage() {
  const raiz = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const [params, setParams] = useSearchParams();
  const avisou = useRef(false);

  // C1: quem acabou de excluir a conta chega aqui com ?conta=excluida. Effect (não render) por causa
  // do SSG; o parâmetro sai da URL para o aviso não voltar num F5.
  useEffect(() => {
    if (params.get('conta') !== 'excluida' || avisou.current) return;
    avisou.current = true;
    showToast('Sua conta foi excluída.', 'success');
    setParams({}, { replace: true });
  }, [params, setParams, showToast]);

  useRevelarAoRolar(raiz);

  return (
    <div ref={raiz} className="auth-bg landing-root">
      <LandingNav />
      <main className="relative z-[1]">
        <LandingBusca />
        <LandingBento />
        <LandingPassos />
        <LandingRegioes />
        <LandingFontes />
        <LandingFaq />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
