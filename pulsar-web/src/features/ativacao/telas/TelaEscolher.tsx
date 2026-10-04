import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Navigation, Search, X } from 'lucide-react';
import type { FaixaRisco } from '../../../types';
import { normalizarNome } from '../../../utils/texto';
import { emNomeDe } from '../../../data/regioes-seo';

const MAX = 10;
const COR: Record<FaixaRisco, string> = { BAIXO: '#22C55E', MODERADO: '#F59E0B', ALTO: '#EF4444' };

interface Sub { id: string; nome: string; regiaoNome: string; faixaRisco: FaixaRisco }
interface Props {
  subprefeituras: Sub[];
  localizar: () => Promise<string | null>;
  onContinuar: (ids: string[]) => Promise<boolean>;
}

type EstadoGps = 'ocioso' | 'procurando' | 'achou' | 'falhou';

/** Localização como atalho, nunca obrigatória (Life360). Salva só no Continuar. */
export default function TelaEscolher({ subprefeituras, localizar, onContinuar }: Props) {
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => titulo.current?.focus(), []);
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [busca, setBusca] = useState('');
  const [gps, setGps] = useState<EstadoGps>('ocioso');
  const [detectada, setDetectada] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(false);

  const porId = useMemo(() => new Map(subprefeituras.map((s) => [s.id, s])), [subprefeituras]);
  const visiveis = useMemo(() => {
    const q = normalizarNome(busca);
    const lista = [...subprefeituras].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    return q ? lista.filter((s) => normalizarNome(s.nome).includes(q)) : lista;
  }, [subprefeituras, busca]);

  function alternar(id: string) {
    setErro(false);
    setSelecionadas((atual) => atual.includes(id) ? atual.filter((x) => x !== id) : atual.length >= MAX ? atual : [...atual, id]);
  }

  async function usarLocalizacao() {
    setGps('procurando');
    const id = await localizar().catch(() => null);
    const sub = id ? porId.get(id) : undefined;
    if (sub) {
      setDetectada(sub.nome);
      setGps('achou');
      setSelecionadas((atual) => atual.includes(sub.id) || atual.length >= MAX ? atual : [sub.id, ...atual]);
    } else {
      setGps('falhou');
    }
  }

  async function continuar() {
    setSalvando(true);
    setErro(false);
    const ok = await onContinuar(selecionadas);
    setSalvando(false);
    if (!ok) setErro(true);
  }

  const tituloGps = gps === 'achou' && detectada ? `Você está ${emNomeDe(detectada)}`
    : gps === 'procurando' ? 'Procurando…'
    : gps === 'falhou' ? 'Escolha na lista abaixo'
    : 'Usar minha localização';
  const subGps = gps === 'achou' ? 'Já marcamos para você'
    : gps === 'falhou' ? 'Não deu para usar a localização agora'
    : 'Marca a subprefeitura onde você está';

  return (
    <>
      <h1 ref={titulo} tabIndex={-1} className="at-titulo" style={{ fontSize: 26, marginTop: 10 }}>Quais lugares você acompanha?</h1>
      <p className="at-texto" style={{ fontSize: 14.5, marginTop: 8 }}>Casa, trabalho, a escola das crianças. Até {MAX}.</p>

      <button type="button" onClick={usarLocalizacao} disabled={gps === 'procurando'}
        style={{ marginTop: 16, borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 60, textAlign: 'left', flex: '0 0 auto',
          background: 'linear-gradient(135deg, var(--color-pulsar-600), var(--color-pulsar-500))', color: '#fff' }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,.2)', display: 'grid', placeItems: 'center' }}><Navigation size={18} /></span>
        <span aria-live="polite">
          <b style={{ display: 'block', fontFamily: 'var(--font-heading)' }}>{tituloGps}</b>
          <span style={{ fontSize: 12, opacity: .9 }}>{subGps}</span>
        </span>
      </button>

      <label style={{ marginTop: 12, minHeight: 44, borderRadius: 12, background: 'color-mix(in srgb, var(--text-primary) 5%, transparent)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', flex: '0 0 auto' }}>
        <Search size={16} style={{ color: 'var(--text-muted)' }} />
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar subprefeitura" aria-label="Buscar subprefeitura"
          style={{ flex: 1, background: 'transparent', outline: 'none', fontSize: 15, minHeight: 44, color: 'inherit' }} />
      </label>

      <ul style={{ marginTop: 6, flex: 1 }}>
        {visiveis.map((s) => {
          const marcada = selecionadas.includes(s.id);
          return (
            <li key={s.id}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 52, borderBottom: '1px solid color-mix(in srgb, var(--text-primary) 8%, transparent)', cursor: 'pointer' }}>
                <span style={{ width: 8, height: 8, borderRadius: 8, background: COR[s.faixaRisco] }} aria-hidden="true" />
                <span style={{ flex: 1, fontWeight: 600 }}>{s.nome}<span style={{ display: 'block', fontWeight: 400, fontSize: 12, color: 'var(--text-muted)' }}>Zona {s.regiaoNome}</span></span>
                <input type="checkbox" checked={marcada} onChange={() => alternar(s.id)} aria-label={s.nome} className="sr-only" />
                <span aria-hidden="true" style={{ width: 24, height: 24, borderRadius: 24, display: 'grid', placeItems: 'center', color: '#fff',
                  border: marcada ? 'none' : '1.5px solid color-mix(in srgb, var(--text-primary) 25%, transparent)', background: marcada ? 'var(--color-pulsar-600)' : 'transparent' }}>
                  {marcada && <Check size={14} strokeWidth={3} />}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div style={{ position: 'sticky', bottom: 'calc(-1 * max(26px, env(safe-area-inset-bottom)))',
        // Cobre o padding inferior da tela: sem isso a lista aparece embaixo do botão ao rolar.
        margin: '0 -22px calc(-1 * max(26px, env(safe-area-inset-bottom)))', padding: '12px 22px max(26px, env(safe-area-inset-bottom))', background: 'color-mix(in srgb, var(--bg-primary) 82%, transparent)', backdropFilter: 'blur(18px) saturate(180%)' }}>
        {selecionadas.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {selecionadas.map((id) => (
              <button key={id} type="button" onClick={() => alternar(id)} aria-label={`Remover ${porId.get(id)?.nome}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 600, color: 'var(--color-pulsar-600)', background: 'color-mix(in srgb, var(--color-pulsar-500) 14%, transparent)', borderRadius: 999, padding: '6px 10px', minHeight: 32 }}>
                {porId.get(id)?.nome}<X size={12} strokeWidth={2.5} />
              </button>
            ))}
          </div>
        )}
        {erro && <p role="alert" style={{ color: 'var(--cor-alerta)', fontSize: 13.5, marginBottom: 8 }}>Não conseguimos salvar. Tente de novo.</p>}
        <button type="button" className="at-cta" disabled={selecionadas.length === 0 || salvando} onClick={continuar}>Continuar · {selecionadas.length}</button>
      </div>
    </>
  );
}
