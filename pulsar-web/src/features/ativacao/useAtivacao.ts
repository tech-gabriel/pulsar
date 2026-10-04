import { useCallback, useEffect, useState } from 'react';
import { track } from '../../analytics';
import { calcularPassos, type ContextoAtivacao, type Passo } from './passos';

/**
 * Orquestra o roteiro do onboarding. O roteiro é FIXADO na primeira vez que o contexto
 * chega: salvar as favoritas no meio não pode tirar "promessa/escolher" da lista e
 * desalinhar o índice (a pessoa voltaria e encontraria outra tela).
 */
export function useAtivacao(ctx: ContextoAtivacao | null) {
  const [passos, setPassos] = useState<Passo[] | null>(() => (ctx ? calcularPassos(ctx) : null));
  // Ajuste durante a renderização (padrão do React para estado derivado de prop que chega depois).
  if (passos === null && ctx) setPassos(calcularPassos(ctx));

  const [indice, setIndice] = useState(0);
  const [direcao, setDirecao] = useState<1 | -1>(1);
  const passo = passos?.[indice] ?? null;

  useEffect(() => {
    if (passos && passo) track.passoVisto(passo, indice + 1, passos.length);
  }, [passos, passo, indice]);

  const avancar = useCallback(() => {
    if (!passos) return;
    setDirecao(1);
    setIndice((i) => Math.min(i + 1, passos.length - 1));
  }, [passos]);

  const voltar = useCallback(() => {
    setDirecao(-1);
    setIndice((i) => Math.max(i - 1, 0));
  }, []);

  const pularPasso = useCallback(() => {
    if (passo) track.passoPulado(passo);
    avancar();
  }, [passo, avancar]);

  const irPara = useCallback((p: Passo) => {
    if (!passos) return;
    const alvo = passos.indexOf(p);
    if (alvo < 0) return;
    setDirecao(alvo >= indice ? 1 : -1);
    setIndice(alvo);
  }, [passos, indice]);

  return { passos, passo, indice, direcao, avancar, voltar, pularPasso, irPara };
}
