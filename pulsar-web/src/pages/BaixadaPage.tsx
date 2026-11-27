import LandingNav from '../components/landing/LandingNav';
import LandingBuscaBaixada from '../components/landing/LandingBuscaBaixada';
import LandingFooter from '../components/landing/LandingFooter';
import { CIDADE_BAIXADA } from '../data/baixada-seo';
import { useSeoHead } from '../hooks/useSeoHead';

const TITLE = 'Risco de alagamento na Baixada Santista · Pulsar';
const DESCRICAO = 'Veja onde costuma alagar em Santos, São Vicente, Guarujá e mais 6 cidades da Baixada Santista e receba alertas no celular quando o risco subir.';

/** Landing pública da Baixada Santista (rota `/baixada-santista`). Visitante autenticado vai ao app em `RotaLanding`. */
export default function BaixadaPage() {
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
    <div className="auth-bg landing-root">
      <LandingNav />
      <main className="relative z-[1]">
        <LandingBuscaBaixada />
      </main>
      <LandingFooter />
    </div>
  );
}
