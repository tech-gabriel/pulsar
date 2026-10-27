import { useState } from 'react';

export const CHAVE_TRANSPARENCIA = 'pulsar-transparencia';
const CLASSE = 'sem-transparencia';

/**
 * Efeito de vidro do cabeçalho ligado ou não, por aparelho (como o tema). Desligado, o
 * `<html>` ganha `sem-transparencia` e o vidro vira superfície sólida (index.css). O
 * public/theme-init.js aplica a classe antes do primeiro paint; aqui só se lê e alterna.
 * O "Reduzir transparência" do sistema também deixa sólido, direto no CSS.
 */
export function useTransparencia(): { ligada: boolean; alternar: () => void } {
  // Usado só em telas do app (sem prerender); a guarda de document cobre o SSG por segurança.
  const [ligada, setLigada] = useState(() => typeof document === 'undefined' || !document.documentElement.classList.contains(CLASSE));

  function alternar() {
    const nova = !ligada;
    setLigada(nova);
    document.documentElement.classList.toggle(CLASSE, !nova);
    try {
      if (nova) localStorage.removeItem(CHAVE_TRANSPARENCIA);
      else localStorage.setItem(CHAVE_TRANSPARENCIA, 'desligada');
    } catch {
      /* sem armazenamento: vale só nesta visita */
    }
  }

  return { ligada, alternar };
}
