import { useId, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { ATALHOS_BAIXADA, buscarMunicipio, getMunicipioPorSlug } from '../../data/baixada-seo';
import { gsap, useGSAP, COM_MOVIMENTO } from '../../motion/gsap';
import CartaoMunicipio from './CartaoMunicipio';
import SeletorCidade from './SeletorCidade';
import MapaBaixada, { LegendaMapaBaixada } from './MapaBaixada';

/**
 * Hero da landing da Baixada Santista: o mesmo desenho do LandingBusca, com os 9
 * municípios no lugar das subprefeituras. Busca local, sem API.
 */
export default function LandingBuscaBaixada() {
  const raiz = useRef<HTMLElement>(null);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState('santos');
  const [ativo, setAtivo] = useState(0);
  const listaId = useId();
  const resultados = useMemo(() => buscarMunicipio(q), [q]);
  const semResultado = q.trim().length >= 2 && resultados.length === 0;

  // Só o ambiente se move sozinho. O texto do hero não anima: ele é o LCP.
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
          <p className="lp-rotulo">Risco de alagamento em</p>
          <div className="mt-3"><SeletorCidade atual="baixada-santista" /></div>
          <h1 className="lp-titulo mt-4 font-bold leading-[1.02]" style={{ fontSize: 'clamp(40px, 6vw, 68px)', color: 'var(--text-primary)' }}>
            Vai alagar na sua cidade?
          </h1>
          <p className="mt-5 mx-auto lg:mx-0 max-w-[44ch] text-[17px] sm:text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Escolha onde você mora ou trabalha. Mostramos onde costuma alagar e avisamos no celular quando o risco subir.
          </p>

          <div className="relative mt-8 mx-auto lg:mx-0 max-w-[540px] text-left">
            <label className="lp-busca flex items-center gap-3 h-14 px-5 rounded-full">
              <Search size={20} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
              <span className="sr-only">Cidade da Baixada Santista</span>
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setAtivo(0); }}
                onKeyDown={aoTeclar}
                placeholder="Ex.: Santos, Guarujá, Praia Grande"
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
                {resultados.map((m, i) => (
                  <li key={m.slug} id={`${listaId}-${i}`} role="option" aria-selected={i === ativo}>
                    <button type="button" onClick={() => escolher(m.slug)} onMouseEnter={() => setAtivo(i)}
                      className="w-full text-left px-5 py-3 transition-colors"
                      style={{ background: i === ativo ? 'var(--bg-glass-hover)' : undefined }}>
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{m.nome}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {semResultado && (
              <p className="mt-3 text-sm text-center lg:text-left" style={{ color: 'var(--text-muted)' }}>
                Não achamos essa cidade. A Baixada tem 9: tente Santos, Guarujá ou Praia Grande.
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap justify-center lg:justify-start gap-2">
            {ATALHOS_BAIXADA.map((slug) => {
              const ligado = slug === sel;
              return (
                <button key={slug} type="button" onClick={() => escolher(slug)} aria-pressed={ligado}
                  className={`lp-chip h-9 px-3.5 rounded-full text-[13px] font-medium ${ligado ? 'lp-chip-ligado' : ''}`}>
                  {getMunicipioPorSlug(slug)!.nome}
                </button>
              );
            })}
          </div>

          <div className="mt-8 mx-auto lg:mx-0 max-w-[540px]">
            <CartaoMunicipio slug={sel} />
          </div>
        </div>

        {/* O mapa só entra a partir do desktop: no celular o cartão já responde. */}
        <div className="hidden lg:block w-full max-w-[520px] mx-auto">
          <MapaBaixada selecionado={sel} onSelecionar={escolher} className="max-h-[720px]" />
          <div className="mt-3 flex items-center justify-between gap-3">
            <LegendaMapaBaixada />
            <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Clique numa cidade</span>
          </div>
        </div>
      </div>
    </header>
  );
}
