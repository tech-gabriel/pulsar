import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { BellOff, CheckCircle, MapPin, SlidersHorizontal } from 'lucide-react';
import iconePulsar from '../../../assets/logos/pulsar-icone.svg';
import { listaNomes } from '../../../utils/texto';
import { emNomeDe } from '../../../data/regioes-seo';
import { usePrefereMenosMovimento } from '../../../hooks/usePrefereMenosMovimento';

/** retomada: primeira abertura do app instalado (iPhone), que volta direto aqui. */
interface Props { nomes: string[]; ocupado: boolean; onAtivar: () => void; retomada?: boolean }

/** Mostrar o aviso antes de pedir (permission priming, Citizen/Life360). */
export default function TelaAlerta({ nomes, ocupado, onAtivar, retomada = false }: Props) {
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => titulo.current?.focus(), []);
  const menos = usePrefereMenosMovimento();
  const exemplo = nomes[0] ?? 'Mooca';
  return (
    <>
      {retomada && (
        <p role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600, color: '#166534', background: '#DCFCE7', borderRadius: 12, padding: '8px 12px', marginTop: 6 }}>
          <CheckCircle size={16} />App instalado. Falta só um passo.
        </p>
      )}
      <div className="at-bloqueio" aria-hidden="true">
        <div style={{ position: 'absolute', top: 22, width: '100%', textAlign: 'center', font: '600 44px/1 var(--font-heading)', letterSpacing: '-0.02em', opacity: .92 }}>17:42</div>
        <motion.div className="at-notif"
          initial={menos ? { opacity: 0 } : { opacity: 0, y: -28, scale: .96, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          transition={menos ? { duration: .2 } : { type: 'spring', bounce: 0, duration: .6, delay: .3 }}>
          <img src={iconePulsar} alt="" width={30} height={30} style={{ borderRadius: 8, background: '#fff' }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#3d4b59' }}><span>PULSAR</span><span>agora</span></div>
            <b style={{ display: 'block', fontSize: 13 }}>Alerta de alagamento {emNomeDe(exemplo)}</b>
            <p style={{ fontSize: 12, lineHeight: 1.3 }}>Chuva de 20 mm nas últimas 3 horas, com o solo já encharcado.</p>
          </div>
        </motion.div>
      </div>
      <h1 ref={titulo} tabIndex={-1} className="at-titulo" style={{ marginTop: 18, fontSize: 25 }}>{retomada ? 'Agora sim: ative os alertas' : 'Seja avisado antes da chuva forte'}</h1>
      <div className="at-lista-gar">
        {nomes.length > 0 && <p className="at-gar"><MapPin size={16} />Só sobre {listaNomes(nomes)}, os lugares que você escolheu.</p>}
        <p className="at-gar"><BellOff size={16} />No máximo 3 avisos por dia. Alerta sempre chega.</p>
        <p className="at-gar"><SlidersHorizontal size={16} />Desligue quando quiser, em Configurações.</p>
      </div>
      <button type="button" className="at-cta" onClick={onAtivar} disabled={ocupado}>{ocupado ? 'Ativando…' : 'Ativar alertas'}</button>
    </>
  );
}
