import LoadingSpinner from './ui/LoadingSpinner';

/**
 * Placeholder das rotas carregadas sob demanda (`lazy`) no primeiro acesso.
 *
 * Sem ele, /login, /cadastro e /app/* renderizavam **nada** até o chunk da
 * página chegar, e o React Router avisava no console ("No `HydrateFallback`
 * element provided"). Em rede lenta isso é tela vazia por vários segundos.
 *
 * Só aparece no carregamento inicial do documento; navegação client-side não
 * passa por aqui.
 */
export default function CarregandoRota() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner mensagem="Carregando..." />
    </div>
  );
}
