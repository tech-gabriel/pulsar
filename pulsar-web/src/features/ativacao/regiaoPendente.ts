import { getSubprefeituraPorSlug } from '../../data/regioes-seo';

// A subprefeitura que a pessoa escolheu numa página pública (/cadastro?regiao=<slug>) chega
// marcada no onboarding. Fica no navegador porque o caminho até lá passa pela confirmação de
// e-mail ou pelo Google; vence em 24 h. Só marca, quem salva é a pessoa no Continuar.
const CHAVE = 'pulsar-regiao-pendente-v1';
const VALIDADE_MS = 24 * 60 * 60 * 1000;

export function guardarRegiaoPendente(slug: string, agora = Date.now()): void {
  if (!getSubprefeituraPorSlug(slug)) return; // zona ou slug inválido: nada a marcar
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ slug, em: agora }));
  } catch {
    /* sem armazenamento: segue sem pré-seleção */
  }
}

export function lerRegiaoPendente(agora = Date.now()): string | null {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return null;
    const { slug, em } = JSON.parse(bruto) as { slug?: string; em?: number };
    if (!slug || typeof em !== 'number' || agora - em > VALIDADE_MS || !getSubprefeituraPorSlug(slug)) {
      localStorage.removeItem(CHAVE);
      return null;
    }
    return slug;
  } catch {
    return null;
  }
}

export function limparRegiaoPendente(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    /* nada a limpar */
  }
}
