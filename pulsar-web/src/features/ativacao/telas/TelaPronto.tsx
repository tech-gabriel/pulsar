import { useEffect, useRef } from 'react';
import { BellRing, BellOff } from 'lucide-react';
import BadgeRisco from '../../../components/ui/BadgeRisco';
import type { FaixaRisco } from '../../../types';
import { slugify } from '../../../data/regioes-seo';
import MapaSP from '../MapaSP';

const COR: Record<FaixaRisco, string> = { BAIXO: '#22C55E', MODERADO: '#F59E0B', ALTO: '#EF4444' };

interface Props {
  primeiroNome: string;
  escolhidas: { id: string; nome: string; faixaRisco: FaixaRisco }[];
  alerta: 'ativo' | 'negado' | 'nao-pedido';
  onVerMapa: () => void;
}

/** Fecha o ciclo mostrando o que mudou (Duolingo/Apple). O único rebote do fluxo é o selo. */
export default function TelaPronto({ primeiroNome, escolhidas, alerta, onVerMapa }: Props) {
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titulo.current?.focus();
    navigator.vibrate?.(10); // retorno tátil curto, só aqui (conclusão)
  }, []);
  const destaques = Object.fromEntries(escolhidas.map((e) => [slugify(e.nome), COR[e.faixaRisco]]));
  return (
    <>
      <div className="at-selo" aria-hidden="true">
        <svg width="46" height="46" viewBox="0 0 46 46"><path d="M12 24 L20 32 L35 15" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <h1 ref={titulo} tabIndex={-1} className="at-titulo" style={{ textAlign: 'center', fontSize: 27 }}>Tudo pronto, {primeiroNome}</h1>
      {escolhidas.length > 0 && (
        <>
          <p className="at-texto" style={{ textAlign: 'center', marginTop: 8 }}>Você será avisado antes do risco nestes lugares:</p>
          <ul style={{ marginTop: 16, borderRadius: 18, background: 'color-mix(in srgb, var(--text-primary) 4%, transparent)', padding: '4px 14px' }}>
            {escolhidas.map((e) => (
              <li key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0' }}>
                <span style={{ flex: 1, fontWeight: 600 }}>{e.nome}</span>
                <BadgeRisco faixa={e.faixaRisco} size="sm" />
              </li>
            ))}
          </ul>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}><MapaSP className="at-mapa-mini" destaques={destaques} /></div>
        </>
      )}
      <p style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
        {alerta === 'ativo' ? <><BellRing size={16} color="#16A34A" />Alertas ligados neste aparelho</>
          : alerta === 'negado' ? <><BellOff size={16} />Os alertas ficaram bloqueados; dá para liberar nas configurações do navegador.</>
          : null}
      </p>
      <button type="button" className="at-cta" onClick={onVerMapa}>Ver o mapa</button>
    </>
  );
}
