import { useLayoutEffect, useRef, useState } from 'react';
import { escolherFrase } from '../../utils/frase';

let tela: CanvasRenderingContext2D | null | undefined;

/** Uma linha que sempre cabe: escolhe a versão da frase pela largura que o elemento tem. */
export default function FraseQueCabe({ frases, className }: { frases: string[]; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [medida, setMedida] = useState<{ largura: number; medir: (t: string) => number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ler = () => {
      const cs = getComputedStyle(el);
      tela ??= document.createElement('canvas').getContext('2d');
      if (!tela) return;
      const ctx = tela;
      const fonte = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const largura = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      // +1 px de folga: o canvas arredonda diferente do texto na tela.
      setMedida({ largura, medir: (t) => { ctx.font = fonte; return ctx.measureText(t).width + 1; } });
    };
    const obs = new ResizeObserver(ler);
    obs.observe(el);
    // A fonte da web pode chegar depois: mede de novo quando carregar.
    void document.fonts?.ready.then(ler);
    return () => obs.disconnect();
  }, []);

  const { texto, escala } = medida ? escolherFrase(frases, medida.largura, medida.medir) : escolherFrase(frases, null, () => 0);
  // A escala vai no span de dentro: o de fora guarda o tamanho da classe, que é o que se mede.
  return (
    <span ref={ref} className={className} style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
      <span style={escala < 1 ? { fontSize: `${escala}em` } : undefined}>{texto}</span>
    </span>
  );
}
