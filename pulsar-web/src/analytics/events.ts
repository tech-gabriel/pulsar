import { posthog, isAnalyticsEnabled } from './posthog';
import type { Passo } from '../features/ativacao/passos';
import type { Plataforma } from '../features/ativacao/instalacao';

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
  | 'clicou_instagram'
  | 'ativacao_passo_visto'
  | 'ativacao_passo_pulado'
  | 'ativacao_concluida'
  | 'instalou_app'
  | 'clicou_convite_regiao'
  | 'abriu_rota'
  | 'viu_veredito_rota'
  | 'abriu_app_rota'
  | 'pediu_aviso_rota'
  | 'salvou_local'
  | 'usou_local';

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
  // Nome do evento mantido para não quebrar o funil no PostHog; o alvo agora é a subprefeitura.
  favoritouRegiao: (subprefeituraId: string) => capturar('favoritou_regiao', { subprefeituraId }),
  ativouPush: () => capturar('ativou_push'),
  usouGeolocalizacao: (sucesso: boolean) => capturar('usou_geolocalizacao', { sucesso }),
  buscouEndereco: () => capturar('buscou_endereco'),
  salvouLocal: (tipo: 'casa' | 'trabalho', origem: 'rota' | 'configuracoes') => capturar('salvou_local', { tipo, origem }),
  usouLocal: (tipo: 'casa' | 'trabalho') => capturar('usou_local', { tipo }),
  viuNovidades: (versao: string) => capturar('viu_novidades', { versao }),
  clicouInstagram: (origem: string) => capturar('clicou_instagram', { origem }),
  passoVisto: (passo: Passo, ordem: number, total: number) => capturar('ativacao_passo_visto', { passo, ordem, total }),
  passoPulado: (passo: Passo) => capturar('ativacao_passo_pulado', { passo }),
  ativacaoConcluida: (p: { favoritas: number; alerta: boolean; instalou: boolean }) => capturar('ativacao_concluida', p),
  instalouApp: (plataforma: Plataforma) => capturar('instalou_app', { plataforma }),
  // Convite das páginas públicas (cadastro ou, logado, o mapa): mede visita para cadastro.
  clicouConviteRegiao: (origem: string, regiao: string, logado: boolean) => capturar('clicou_convite_regiao', { origem, regiao, logado }),
  // Rota com risco no caminho. Sem coordenadas: só o estado e o app escolhido.
  abriuRota: (origem: 'chip' | 'como_chegar') => capturar('abriu_rota', { origem }),
  viuVereditoRota: (estado: string) => capturar('viu_veredito_rota', { estado }),
  abriuAppRota: (app: 'google' | 'waze' | 'apple') => capturar('abriu_app_rota', { app }),
  pediuAvisoRota: () => capturar('pediu_aviso_rota'),
};
