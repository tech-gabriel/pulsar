import { useId, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { subprefeituras } from '../../data/regioes-seo';
import { buscarRegiao } from '../../data/landing-dados';
import { gsap, useGSAP, COM_MOVIMENTO } from '../../motion/gsap';
import CartaoRegiao from './CartaoRegiao';
import MapaAlagamentos, { LegendaMapa } from './MapaAlagamentos';

const ATALHOS = ['butanta', 'mooca', 'sao-miguel', 'campo-limpo', 'santana-tucuruvi'];

/**
 * Hero da landing: a busca é a primeira coisa. A pessoa digita o bairro e vê o
 * histórico da região antes de qualquer cadastro. Busca local, sem API.
 */
export default function LandingBusca() {
  const raiz = useRef<HTMLElement>(null);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState('butanta');
  const [ativo, setAtivo] = useState(0);
  const listaId = useId();
  const resultados = useMemo(() => buscarRegiao(q), [q]);
  const semResultado = q.trim().length >= 2 && resultados.length === 0;

  // Só o ambiente se move sozinho. O texto do hero não anima: ele é o LCP e já
  // chega pintado no HTML do SSG.
  useGSAP(() => {
    gsap.matchMedia().add(COM_MOVIMENTO, () => {
      gsap.to('[data-aura="a"]', { xPercent: 12, yPercent: 8, duration: 9, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      gsap.to('[data-aura="b"]', { xPercent: -10, yPercent: -6, duration: 11, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    });
  }, { scope: raiz });

  function escolher(slug: string) {
    setSel(slug);
    setQ('');
    setAtivo(0);
  }

  function aoTeclar(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAtivo((i) => Math.min(i + 1, resultados.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && resultados[ativo]) { e.preventDefault(); escolher(resultados[ativo].slug); }
    else if (e.key === 'Escape') setQ('');
  }

  return (
    <header ref={raiz} className="lp-hero relative overflow-hidden">
      <div aria-hidden="true" className="lp-aura lp-aura-a" data-aura="a" />
      <div aria-hidden="true" className="lp-aura lp-aura-b" data-aura="b" />

      <div className="relative max-w-[1180px] mx-auto px-4 sm:px-8 pt-10 sm:pt-14 pb-14 lg:pb-16 grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-14 items-center">
        <div className="text-center lg:text-left">
          <p className="lp-rotulo">Risco de alagamento em São Paulo</p>
          <h1 className="lp-titulo mt-4 font-bold leading-[1.02]" style={{ fontSize: 'clamp(40px, 6vw, 68px)', color: 'var(--text-primary)' }}>
            Vai alagar no seu bairro?
          </h1>
          <p className="mt-5 mx-auto lg:mx-0 max-w-[44ch] text-[17px] sm:text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Digite onde você mora ou trabalha. Mostramos o histórico da região e avisamos no celular quando o risco subir.
          </p>

          <div className="relative mt-8 mx-auto lg:mx-0 max-w-[540px] text-left">
            <label className="lp-busca flex items-center gap-3 h-14 px-5 rounded-full">
              <Search size={20} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
              <span className="sr-only">Bairro ou subprefeitura</span>
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setAtivo(0); }}
                onKeyDown={aoTeclar}
                placeholder="Ex.: Pinheiros, Itaquera, Santana"
                role="combobox"
                aria-expanded={resultados.length > 0}
                aria-controls={listaId}
                aria-activedescendant={resultados.length > 0 ? `${listaId}-${ativo}` : undefined}
                autoComplete="off"
                className="flex-1 min-w-0 bg-transparent outline-none text-[16px]"
                style={{ color: 'var(--text-primary)' }}
              />
            </label>
            {resultados.length > 0 && (
              <ul id={listaId} role="listbox" className="lp-superficie lp-sugestoes absolute z-20 mt-2 w-full rounded-2xl overflow-hidden py-1">
                {resultados.map((r, i) => (
                  <li key={r.rotulo + r.slug} id={`${listaId}-${i}`} role="option" aria-selected={i === ativo}>
                    <button type="button" onClick={() => escolher(r.slug)} onMouseEnter={() => setAtivo(i)}
                      className="w-full text-left px-5 py-3 transition-colors"
                      style={{ background: i === ativo ? 'var(--bg-glass-hover)' : undefined }}>
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{r.rotulo}</span>
                      <span className="block text-[13px]" style={{ color: 'var(--text-muted)' }}>{r.detalhe}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {semResultado && (
              <p className="mt-3 text-sm text-center lg:text-left" style={{ color: 'var(--text-muted)' }}>
                Não achamos esse nome. Tente o bairro ou a subprefeitura.
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap justify-center lg:justify-start gap-2">
            {ATALHOS.map((slug) => {
              const s = subprefeituras.find((x) => x.slug === slug)!;
              const ligado = slug === sel;
              return (
                <button key={slug} type="button" onClick={() => escolher(slug)} aria-pressed={ligado}
                  className={`lp-chip h-9 px-3.5 rounded-full text-[13px] font-medium ${ligado ? 'lp-chip-ligado' : ''}`}>
                  {s.nome}
                </button>
              );
            })}
          </div>

          <div className="mt-8 mx-auto lg:mx-0 max-w-[540px]">
            <CartaoRegiao slug={sel} />
          </div>
        </div>

        {/* O mapa só entra a partir do desktop: no celular o cartão já responde e o mapa aparece no bento. */}
        <div className="hidden lg:block w-full max-w-[520px] mx-auto">
          <MapaAlagamentos selecionada={sel} onSelecionar={escolher} className="max-h-[720px]" />
          <div className="mt-3 flex items-center justify-between gap-3">
            <LegendaMapa />
            <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Clique numa região</span>
          </div>
        </div>
      </div>
    </header>
  );
}
