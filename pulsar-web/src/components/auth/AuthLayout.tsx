import type { ReactNode } from 'react';
import MapaCoropletico from '../../features/cidade/MapaCoropletico';
import simboloBranco from '../../assets/logos/pulsar-simbolo-branco.svg';

/**
 * Layout das telas de autenticação: um painel azul da marca, com o mapa de São Paulo
 * desenhado em branco e a promessa do produto, ao lado do formulário. No celular o
 * painel vira uma faixa no topo e o formulário sobe por cima dela, como uma folha.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-bg auth-split">
      <aside className="auth-vitrine">
        <div className="auth-vitrine-marca">
          <img src={simboloBranco} alt="" width={34} height={34} />
          <span>pulsar</span>
        </div>
        <MapaCoropletico className="auth-vitrine-mapa" cores={{ se: 'var(--color-pulsar-300)' }} />
        <div className="auth-vitrine-texto">
          <p className="auth-vitrine-titulo">Saiba antes que a água chegue.</p>
          <p className="auth-vitrine-sub">Risco de chuva e alagamento nas 32 subprefeituras de São Paulo, em tempo real.</p>
          <span className="auth-vitrine-selo"><i aria-hidden="true" />Atualizado a cada 15 minutos</span>
        </div>
      </aside>

      <main className="auth-form-pane">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
    </div>
  );
}
