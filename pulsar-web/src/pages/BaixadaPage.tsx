import { useRef } from 'react';
import LandingNav from '../components/landing/LandingNav';
import LandingBuscaBaixada from '../components/landing/LandingBuscaBaixada';
import LandingBento from '../components/landing/LandingBento';
import LandingPassos from '../components/landing/LandingPassos';
import LandingRegioes from '../components/landing/LandingRegioes';
import LandingFontes from '../components/landing/LandingFontes';
import LandingFaq from '../components/landing/LandingFaq';
import LandingCta from '../components/landing/LandingCta';
import LandingFooter from '../components/landing/LandingFooter';
import { CIDADE_BAIXADA } from '../data/baixada-seo';
import { useSeoHead } from '../hooks/useSeoHead';
import { useRevelarAoRolar } from '../motion/gsap';

const TITLE = 'Risco de alagamento na Baixada Santista · Pulsar';
const DESCRICAO = 'Veja onde costuma alagar em Santos, São Vicente, Guarujá e mais 6 cidades da Baixada Santista e receba alertas no celular quando o risco subir.';

/**
 * Landing pública da Baixada Santista (rota `/baixada-santista`): as mesmas seções da capital,
 * com os dados da Baixada. Visitante autenticado vai ao app em `RotaLanding`.
 */
export default function BaixadaPage() {
  const raiz = useRef<HTMLDivElement>(null);
  useRevelarAoRolar(raiz);
  useSeoHead({
    title: TITLE,
    descricao: DESCRICAO,
    path: CIDADE_BAIXADA.path,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: TITLE,
      description: DESCRICAO,
      url: `https://app-pulsar.com.br${CIDADE_BAIXADA.path}`,
      about: { '@type': 'Place', name: CIDADE_BAIXADA.nome },
    },
  });

  return (
    <div ref={raiz} className="auth-bg landing-root">
      <LandingNav />
      <main className="relative z-[1]">
        <LandingBuscaBaixada />
        <LandingBento cidade="baixada" />
        <LandingPassos />
        <LandingRegioes cidade="baixada" />
        <LandingFontes cidade="baixada" />
        <LandingFaq />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
