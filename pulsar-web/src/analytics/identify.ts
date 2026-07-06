import { posthog, isAnalyticsEnabled } from './posthog';
import type { UsuarioDto } from '../types';

/** Liga a sessão anônima ao usuário. Envia e-mail/nome como propriedades da pessoa. */
export function identifyUser(usuario: UsuarioDto): void {
  if (!isAnalyticsEnabled()) return;
  posthog.identify(usuario.id, { email: usuario.email, nome: usuario.nome });
}

/** No logout: desassocia a sessão do usuário. */
export function resetAnalytics(): void {
  if (!isAnalyticsEnabled()) return;
  posthog.reset();
}
