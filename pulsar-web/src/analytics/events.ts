import { posthog, isAnalyticsEnabled } from './posthog';

export type NomeEvento =
  | 'visitou_landing'
  | 'visitou_app'
  | 'cadastrou'
  | 'login'
  | 'favoritou_regiao'
  | 'ativou_push'
  | 'usou_geolocalizacao'
  | 'buscou_endereco'
  | 'viu_novidades'
  | 'clicou_instagram';

function capturar(nome: NomeEvento, props?: Record<string, unknown>): void {
  if (!isAnalyticsEnabled()) return;
  posthog.capture(nome, props);
}

/** Pageview do SPA. Mantido separado dos eventos de funil (nome nativo do PostHog). */
export function capturarPageview(path: string): void {
  if (!isAnalyticsEnabled()) return;
  posthog.capture('$pageview', { path });
}

export const track = {
  visitouLanding: (path: string) => capturar('visitou_landing', { path }),
  visitouApp: (path: string) => capturar('visitou_app', { path }),
  cadastrou: (metodo: 'email' | 'google') => capturar('cadastrou', { metodo }),
  login: (metodo: 'email' | 'google') => capturar('login', { metodo }),
  favoritouRegiao: (regiaoId: string) => capturar('favoritou_regiao', { regiaoId }),
  ativouPush: () => capturar('ativou_push'),
  usouGeolocalizacao: (sucesso: boolean) => capturar('usou_geolocalizacao', { sucesso }),
  buscouEndereco: () => capturar('buscou_endereco'),
  viuNovidades: (versao: string) => capturar('viu_novidades', { versao }),
  clicouInstagram: (origem: string) => capturar('clicou_instagram', { origem }),
};
