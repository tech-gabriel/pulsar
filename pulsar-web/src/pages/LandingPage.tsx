import LandingNav from '../components/landing/LandingNav';
import LandingHero from '../components/landing/LandingHero';
import LandingProblema from '../components/landing/LandingProblema';
import LandingFeatures from '../components/landing/LandingFeatures';
import LandingComoFunciona from '../components/landing/LandingComoFunciona';
import LandingFontes from '../components/landing/LandingFontes';
import LandingCta from '../components/landing/LandingCta';
import LandingFooter from '../components/landing/LandingFooter';

/**
 * Landing page pública/promocional do Pulsar (rota `/`). Respeita o tema global
 * (claro/escuro) do `ThemeProvider` — o `LandingNav` traz o toggle. Fundo grid
 * de `.auth-bg`. Visitante autenticado é redirecionado em `RotaLanding`.
 */
export default function LandingPage() {
  return (
    <div className="auth-bg landing-root">
      <LandingNav />
      <main className="relative z-[1]">
        <LandingHero />
        <LandingProblema />
        <LandingFeatures />
        <LandingComoFunciona />
        <LandingFontes />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
