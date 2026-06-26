# Prints do produto para a landing page

Coloque aqui os screenshots reais do app usados na landing pública (`/`):

- `mapa.png` — captura do mapa de risco (`/app`).
- `dashboard.png` — captura do painel (`/app/dashboard`).

Depois de adicioná-los, ative-os nos componentes (substituindo os placeholders):

- `src/components/landing/LandingHero.tsx` → importar `mapa.png` e trocar
  `.landing-shot-placeholder` por `<img src={mapaShot} alt="Mapa de risco do Pulsar" />`.
- `src/components/landing/LandingComoFunciona.tsx` → importar `dashboard.png` e trocar
  `.landing-shot-placeholder` por `<img src={dashboardShot} alt="Painel do Pulsar" />`.

O Vite cuida do hash/otimização no import.
