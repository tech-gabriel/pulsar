import { useEffect, useRef, type RefObject } from 'react';
import { flushSync } from 'react-dom';

/**
 * Onde o gesto pararia se continuasse com a velocidade do dedo (px/s), pela desaceleração
 * exponencial das rolagens do iOS. É o que faz um peteleco curto abrir a folha inteira.
 */
export function projetar(velocidadePxS: number, taxa = 0.998): number {
  return ((velocidadePxS / 1000) * taxa) / (1 - taxa);
}

/** Passou do limite: a folha ainda acompanha o dedo, cada vez menos, em vez de travar. */
export function elastico(excesso: number, dimensao: number, c = 0.55): number {
  return (excesso * dimensao * c) / (dimensao + c * Math.abs(excesso));
}

/** Bem abaixo da altura curta, a pessoa quis fechar; senão vale a parada mais próxima. */
export function paradaDaFolha(alturaProjetada: number, curta: number, aberta: number): 'fechar' | 'curta' | 'aberta' {
  if (alturaProjetada < curta * 0.6) return 'fechar';
  return alturaProjetada - curta < aberta - alturaProjetada ? 'curta' : 'aberta';
}

// Antes disto o gesto é um toque, e quem responde é o onClick da alça.
const FOLGA_TOQUE = 6;
// Só os últimos instantes contam para a velocidade: o dedo que parou antes de soltar não arremessa.
const JANELA_VELOCIDADE_MS = 100;

interface Opcoes {
  aberta: boolean;
  /** Ausente fora da folha do celular: o hook não faz nada. */
  onMudar?: (aberta: boolean) => void;
  onFechar: () => void;
}

/**
 * Arrasto da alça da folha do detalhe (celular). A folha segue o dedo 1:1, com elástico acima
 * da altura máxima; ao soltar, a velocidade projeta onde o gesto ia parar e escolhe entre
 * fechar, curta e aberta. A animação até a parada é do useAlturaFluida, que não anima
 * enquanto `data-arrastando` existe e parte da altura em que o dedo soltou.
 */
export function useArrastoFolha(alca: RefObject<HTMLElement | null>, opcoes: Opcoes) {
  const atual = useRef(opcoes);
  useEffect(() => { atual.current = opcoes; });
  const ativo = !!opcoes.onMudar;

  useEffect(() => {
    const el = alca.current;
    const folha = el?.closest<HTMLElement>('.folha-mapa');
    if (!ativo || !el || !folha) return;

    let gesto: { y: number; altura: number; maxima: number } | null = null;
    let arrastando = false;
    let curta = 0;
    let historico: { t: number; y: number }[] = [];

    const alturaEm = (y: number) => {
      if (!gesto) return 0;
      const alvo = gesto.altura - (y - gesto.y);
      return alvo > gesto.maxima ? gesto.maxima + elastico(alvo - gesto.maxima, gesto.maxima) : Math.max(0, alvo);
    };

    const aoDescer = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const altura = folha.getBoundingClientRect().height;
      if (!atual.current.aberta) curta = Number(folha.dataset.alturaFinal) || altura;
      gesto = { y: e.clientY, altura, maxima: parseFloat(getComputedStyle(folha).maxHeight) || altura };
      historico = [{ t: e.timeStamp, y: e.clientY }];
      el.setPointerCapture?.(e.pointerId);
    };

    const aoMover = (e: PointerEvent) => {
      if (!gesto) return;
      if (!arrastando) {
        if (Math.abs(e.clientY - gesto.y) < FOLGA_TOQUE) return;
        arrastando = true;
        // A animação de altura em curso mandaria na folha no lugar do dedo.
        folha.getAnimations().forEach((a) => {
          const quadros = (a.effect as KeyframeEffect | null)?.getKeyframes?.() ?? [];
          if (quadros.some((q) => 'height' in q)) a.cancel();
        });
        folha.dataset.arrastando = '';
      }
      historico.push({ t: e.timeStamp, y: e.clientY });
      if (historico.length > 6) historico.shift();
      folha.style.height = `${alturaEm(e.clientY)}px`;
    };

    const soltar = (e: PointerEvent, comVelocidade: boolean) => {
      if (!gesto) return;
      const foiArrasto = arrastando;
      const altura = alturaEm(e.clientY);
      const { maxima } = gesto;
      gesto = null;
      arrastando = false;
      if (!foiArrasto) return;

      const recentes = historico.filter((h) => e.timeStamp - h.t <= JANELA_VELOCIDADE_MS);
      const [de, ate] = [recentes[0], recentes[recentes.length - 1]];
      // Para baixo é positivo na tela e diminui a altura.
      const velocidade = comVelocidade && de && ate && ate.t > de.t ? ((ate.y - de.y) / (ate.t - de.t)) * 1000 : 0;
      const projetada = paradaDaFolha(altura - projetar(velocidade), curta || maxima * 0.4, maxima);
      // Uma parada por gesto: o arremesso para baixo com a folha aberta para na curta, não fecha.
      const parada = projetada === 'fechar' && atual.current.aberta ? 'curta' : projetada;

      // O clique que o navegador dispara depois do arrasto alternaria a folha de novo.
      const engolir = (c: Event) => { c.stopPropagation(); c.preventDefault(); };
      el.addEventListener('click', engolir, { capture: true, once: true });
      setTimeout(() => el.removeEventListener('click', engolir, { capture: true }), 0);

      // Estado novo e altura livre no mesmo quadro: a animação sai de onde o dedo soltou.
      flushSync(() => {
        if (parada === 'fechar') atual.current.onFechar();
        else atual.current.onMudar?.(parada === 'aberta');
      });
      folha.style.height = '';
      delete folha.dataset.arrastando;
    };
    const aoSubir = (e: PointerEvent) => soltar(e, true);
    const aoCancelar = (e: PointerEvent) => soltar(e, false);

    el.addEventListener('pointerdown', aoDescer);
    el.addEventListener('pointermove', aoMover);
    el.addEventListener('pointerup', aoSubir);
    el.addEventListener('pointercancel', aoCancelar);
    return () => {
      el.removeEventListener('pointerdown', aoDescer);
      el.removeEventListener('pointermove', aoMover);
      el.removeEventListener('pointerup', aoSubir);
      el.removeEventListener('pointercancel', aoCancelar);
      folha.style.height = '';
      delete folha.dataset.arrastando;
    };
  }, [alca, ativo]);
}
