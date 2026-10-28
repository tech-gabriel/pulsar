import { useRef } from 'react';
import LandingNav from '../components/landing/LandingNav';
import LandingBusca from '../components/landing/LandingBusca';
import LandingBento from '../components/landing/LandingBento';
import LandingPassos from '../components/landing/LandingPassos';
import LandingRegioes from '../components/landing/LandingRegioes';
import LandingFontes from '../components/landing/LandingFontes';
import LandingFaq from '../components/landing/LandingFaq';
import LandingCta from '../components/landing/LandingCta';
import LandingFooter from '../components/landing/LandingFooter';
import { gsap, ScrollTrigger, useGSAP, COM_MOVIMENTO } from '../motion/gsap';

/**
 * Landing pública do Pulsar (rota `/`). A busca de bairro abre a página; o resto
 * rola normal, sem trava de rolagem. Respeita o tema global (o `LandingNav` traz o
 * toggle). Visitante autenticado é redirecionado em `RotaLanding`.
 */
export default function LandingPage() {
  const raiz = useRef<HTMLDivElement>(null);

  // Um único reveal para a página: todo `[data-revelar]` sobe e aparece ao entrar na
  // tela, em lote, uma vez só. Fica tudo abaixo da dobra, então nada pisca na hidratação.
  useGSAP(() => {
    gsap.matchMedia().add(COM_MOVIMENTO, () => {
      gsap.set('[data-revelar]', { autoAlpha: 0, y: 28 });
      ScrollTrigger.batch('[data-revelar]', {
        start: 'top 88%',
        once: true,
        onEnter: (lote) => gsap.to(lote, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08, overwrite: true }),
      });
    });
  }, { scope: raiz });

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
