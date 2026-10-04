import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, Check, Download, HardDrive, Share, Smartphone, SquarePlus, Zap } from 'lucide-react';
import iconePulsar from '../../../assets/logos/pulsar-icone.svg';

interface Props {
  variante: 'ios' | 'prompt';
  onInstalar: () => Promise<boolean>;
  onInstalado: () => void;
  onSemAlertas: () => void;
}

export default function TelaInstalar({ variante, onInstalar, onInstalado, onSemAlertas }: Props) {
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => titulo.current?.focus(), []);
  const [instalado, setInstalado] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(temporizador.current), []);

  async function instalar() {
    if (await onInstalar()) {
      setInstalado(true);
      temporizador.current = setTimeout(onInstalado, 600);
    }
  }

  const icone = <div className="at-icone-app" aria-hidden="true"><div><img src={iconePulsar} alt="" width={62} height={62} /></div></div>;

  if (variante === 'ios') {
    return (
      <>
        {icone}
        <h1 ref={titulo} tabIndex={-1} className="at-titulo" style={{ fontSize: 25, textAlign: 'center' }}>Coloque o Pulsar na sua tela de início</h1>
        <p className="at-texto" style={{ textAlign: 'center', fontSize: 14.5 }}>No iPhone, os alertas só chegam com o app na tela de início. Leva 10 segundos.</p>
        <ol style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14, color: 'var(--text-secondary)' }}>
          {[
            <>Toque em <Pill><Share size={14} />Compartilhar</Pill>, na barra do Safari</>,
            <>Escolha <Pill><SquarePlus size={14} />Adicionar à Tela de Início</Pill></>,
            <>Abra o Pulsar pelo ícone novo</>,
          ].map((conteudo, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 24, height: 24, flex: '0 0 auto', borderRadius: 24, background: 'var(--color-pulsar-600)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 12 }}>{i + 1}</span>
              <span style={{ flex: 1, lineHeight: 1.9 }}>{conteudo}</span>
            </li>
          ))}
        </ol>
        <div className="at-seta" aria-hidden="true"><ArrowDown size={26} /></div>
        <button type="button" className="at-cta2" style={{ marginTop: 'auto' }} onClick={onSemAlertas}>Continuar sem alertas</button>
      </>
    );
  }

  return (
    <>
      {icone}
      <h1 ref={titulo} tabIndex={-1} className="at-titulo" style={{ fontSize: 25, textAlign: 'center' }}>Tenha o Pulsar a um toque</h1>
      <p className="at-texto" style={{ textAlign: 'center', fontSize: 14.5 }}>Instale para abrir direto da tela inicial, em tela cheia, como um app.</p>
      <div className="at-lista-gar">
        <p className="at-gar"><Smartphone size={16} />Ícone na tela inicial ou na barra de tarefas</p>
        <p className="at-gar"><Zap size={16} />Abre mais rápido, sem barra do navegador</p>
        <p className="at-gar"><HardDrive size={16} />Ocupa quase nada de espaço</p>
      </div>
      <button type="button" className="at-cta" onClick={instalar} disabled={instalado}>
        {instalado ? <><Check size={18} />Instalado</> : <><Download size={18} />Instalar o Pulsar</>}
      </button>
    </>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600, color: 'var(--color-pulsar-600)', background: 'color-mix(in srgb, var(--color-pulsar-500) 12%, transparent)', borderRadius: 8, padding: '3px 7px' }}>{children}</span>;
}
