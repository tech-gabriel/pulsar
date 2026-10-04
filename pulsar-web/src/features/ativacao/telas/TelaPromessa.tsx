import { useEffect, useRef } from 'react';
import MapaCoropletico from '../../cidade/MapaCoropletico';

/** Uma ideia, um botão (Calm/Headspace). O radar pulsa no centro (Sé): ainda não sabemos onde a pessoa está. */
export default function TelaPromessa({ onComecar }: { onComecar: () => void }) {
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => titulo.current?.focus(), []);
  return (
    <>
      <div className="at-hero">
        <MapaCoropletico className="at-mapa" cores={{ se: 'color-mix(in srgb, var(--color-pulsar-400) 55%, var(--bg-primary))' }} />
        <span className="at-anel" /><span className="at-anel" /><span className="at-anel" /><span className="at-pino" />
      </div>
      <h1 ref={titulo} tabIndex={-1} className="at-titulo">Saiba antes de a <em>água chegar.</em></h1>
      <p className="at-texto">Acompanhamos a chuva em São Paulo e avisamos você antes do risco, nos lugares que importam para você.</p>
      <div className="at-fatos">
        <div className="at-fato"><b>32</b><span>subprefeituras</span></div>
        <div className="at-fato"><b>15 min</b><span>atualização</span></div>
        <div className="at-fato"><b>3</b><span>perigos</span></div>
      </div>
      <button type="button" className="at-cta" style={{ marginTop: 'auto' }} onClick={onComecar}>Começar</button>
    </>
  );
}
