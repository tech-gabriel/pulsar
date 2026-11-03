import { BellRing, Loader2 } from 'lucide-react';
import { track } from '../../analytics';
import { linksNavegacao } from '../../features/rota/links';
import type { PontoRota, RotaAvaliacao } from '../../features/rota/tipos';
import { coresParaFaixa, labelFaixa } from '../../utils/risco';
import FaixaHorasRota from './FaixaHorasRota';
import VereditoRota from './VereditoRota';

interface Props {
  resultado: RotaAvaliacao | null;
  origem: PontoRota | null;
  destino: PontoRota | null;
  carregando: boolean;
  erro: 'origemFora' | 'destinoFora' | 'rede' | null;
  avisoPedido: boolean;
  onPedirAviso: () => void;
  /** Ainda descobrindo se o aparelho recebe push: o botão espera. */
  avisoIndisponivel?: boolean;
  onTentarDeNovo?: () => void;
}

const MENSAGEM_ERRO = {
  origemFora: 'O ponto de partida fica fora de São Paulo. A rota cobre só a cidade.',
  destinoFora: 'O destino fica fora de São Paulo. A rota cobre só a cidade.',
  rede: 'Não consegui avaliar o caminho agora. Tente de novo em instantes.',
} as const;

const BOTAO = 'rounded-[14px] min-h-11 flex items-center justify-center gap-1.5 font-semibold text-center';

/**
 * Resultado da rota: veredito, risco hora a hora (só quando há o que esperar), os trechos e
 * a saída para o app de navegação. O traçado e os campos De/Para ficam fora daqui.
 */
export default function PainelRota({ resultado, origem, destino, carregando, erro, avisoPedido, onPedirAviso, avisoIndisponivel = false, onTentarDeNovo }: Props) {
  if (erro) {
    return (
      <div className="mt-3">
        <p role="alert" className="text-sm" style={{ color: 'var(--text-secondary)' }}>{MENSAGEM_ERRO[erro]}</p>
        {erro === 'rede' && onTentarDeNovo && (
          <button type="button" onClick={onTentarDeNovo} className={`${BOTAO} px-4 mt-2.5`}
            style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13 }}>Tentar de novo</button>
        )}
      </div>
    );
  }
  if (carregando) {
    return (
      <p role="status" className="mt-3 flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <Loader2 size={15} className="animate-spin" aria-hidden="true" />Avaliando o caminho…
      </p>
    );
  }
  if (!resultado || !origem || !destino) return null;

  const links = linksNavegacao(origem, destino);
  const esperar = resultado.estado === 'Esperar';
  const comHoras = (resultado.estado === 'ComAtencao' || esperar) && resultado.horas.length > 0;
  const principal = { background: 'var(--color-pulsar-600)' };
  const secundario = { background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13 };
  const link = (app: 'google' | 'waze' | 'apple', href: string, texto: string, classe: string, estilo: React.CSSProperties) => (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => track.abriuAppRota(app)}
      className={classe} style={estilo}>{texto}</a>
  );

  return (
    <div className="mt-3">
      <VereditoRota resultado={resultado} />
      {comHoras && <FaixaHorasRota horas={resultado.horas} />}

      <ul className="mt-3 flex flex-col gap-1.5 list-none p-0">
        {resultado.trechos.map((t) => (
          <li key={t.subprefeituraId} className="flex items-center gap-2 text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
            <i aria-hidden="true" className="w-[9px] h-[9px] rounded-full flex-shrink-0" style={{ background: coresParaFaixa(t.faixa).fill }} />
            <span className="min-w-0 truncate">{t.nome}</span>
            <span className="ml-auto flex-shrink-0">{labelFaixa(t.faixa)}</span>
            {t.alagandoCge && <span className="flex-shrink-0 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>alagando (CGE)</span>}
          </li>
        ))}
      </ul>

      {esperar ? (
        <>
          <button type="button" onClick={onPedirAviso} disabled={avisoPedido || avisoIndisponivel}
            className={`${BOTAO} w-full mt-3.5 text-white disabled:opacity-70`} style={{ ...principal, fontSize: 14 }}>
            <BellRing size={16} aria-hidden="true" />{avisoPedido ? 'Aviso pedido' : 'Me avise quando melhorar'}
          </button>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {link('google', links.google, 'Google Maps', `${BOTAO} px-1`, secundario)}
            {link('waze', links.waze, 'Waze', `${BOTAO} px-1`, secundario)}
            {link('apple', links.apple, 'Apple Maps', `${BOTAO} px-1`, secundario)}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-[1.6fr_1fr_1fr] gap-2 mt-3.5">
          {link('google', links.google, 'Abrir no Google Maps', `${BOTAO} px-1 text-white`, { ...principal, fontSize: 14 })}
          {link('waze', links.waze, 'Waze', `${BOTAO} px-1`, secundario)}
          {link('apple', links.apple, 'Apple Maps', `${BOTAO} px-1`, secundario)}
        </div>
      )}
    </div>
  );
}
