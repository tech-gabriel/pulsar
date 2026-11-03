import { useSyncExternalStore } from 'react';
import { BellRing, Check, ExternalLink, Navigation } from 'lucide-react';
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

type App = 'google' | 'waze' | 'apple';

const MENSAGEM_ERRO = {
  origemFora: 'O ponto de partida fica fora de São Paulo. A rota cobre só a cidade.',
  destinoFora: 'O destino fica fora de São Paulo. A rota cobre só a cidade.',
  rede: 'Não consegui avaliar o caminho agora. Tente de novo em instantes.',
} as const;

const NOME_APP: Record<App, string> = { google: 'Google Maps', waze: 'Waze', apple: 'Apple Maps' };
const APPS: App[] = ['google', 'waze', 'apple'];
const CHAVE_APP_ROTA = 'pulsar-app-rota';

// Quem escuta a troca do app lembrado. A memória vale na sessão mesmo se o armazenamento falhar (aba privada).
const ouvintes = new Set<() => void>();
let appNaMemoria: App | null = null;

function lerApp(): App {
  if (appNaMemoria) return appNaMemoria;
  let salvo: string | null = null;
  try { salvo = localStorage.getItem(CHAVE_APP_ROTA); } catch { /* sem armazenamento: fica o padrão */ }
  if (salvo === 'google' || salvo === 'waze' || salvo === 'apple') return salvo;
  // iPadOS se apresenta como Mac; o toque denuncia.
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  return ios ? 'apple' : 'google';
}

function lembrarApp(a: App) {
  appNaMemoria = a;
  try { localStorage.setItem(CHAVE_APP_ROTA, a); } catch { /* fica só na memória da sessão */ }
  ouvintes.forEach((f) => f());
}

/**
 * O app de navegação da pessoa: o último tocado, senão Google Maps (Apple Maps no iPhone e no
 * iPad). Só conveniência. No servidor (SSG) e na hidratação vale o padrão; o localStorage só é
 * lido no cliente, pelo useSyncExternalStore (sem setState em efeito).
 */
function assinarApp(f: () => void) {
  ouvintes.add(f);
  return () => { ouvintes.delete(f); };
}

function useAppLembrado(): App {
  return useSyncExternalStore(
    assinarApp,
    lerApp,
    () => 'google',
  );
}

/**
 * Resultado da rota: veredito, risco hora a hora (só quando há o que esperar), os trechos e
 * a saída para o app de navegação. Um primário por estado: o app lembrado em Pode ir e Com
 * atenção, o aviso em Esperar e nenhum em Sem leitura. O traçado e os campos ficam fora daqui.
 */
export default function PainelRota({ resultado, origem, destino, carregando, erro, avisoPedido, onPedirAviso, avisoIndisponivel = false, onTentarDeNovo }: Props) {
  const app = useAppLembrado();

  if (erro) {
    return (
      <div className="mt-3">
        <p role="alert" className="text-sm" style={{ color: 'var(--text-secondary)' }}>{MENSAGEM_ERRO[erro]}</p>
        {erro === 'rede' && onTentarDeNovo && (
          <button type="button" onClick={onTentarDeNovo} className="rota-botao rota-secundario px-4 mt-2.5">Tentar de novo</button>
        )}
      </div>
    );
  }
  const pronto = !carregando && resultado && origem && destino;
  if (!carregando && !pronto) return null;

  return (
    <div className="mt-3">
      {/* Mesmo lugar na árvore no carregando e no resultado: o cartão não desmonta, só muda. */}
      <VereditoRota resultado={pronto ? resultado : null} />
      {pronto && <Resultado resultado={resultado} links={linksNavegacao(origem, destino)} app={app} onApp={lembrarApp}
        avisoPedido={avisoPedido} onPedirAviso={onPedirAviso} avisoIndisponivel={avisoIndisponivel} />}
    </div>
  );
}

function Resultado({ resultado, links, app, onApp, avisoPedido, onPedirAviso, avisoIndisponivel }: {
  resultado: RotaAvaliacao; links: Record<App, string>; app: App; onApp: (a: App) => void;
  avisoPedido: boolean; onPedirAviso: () => void; avisoIndisponivel: boolean;
}) {
  const esperar = resultado.estado === 'Esperar';
  const comHoras = (resultado.estado === 'ComAtencao' || esperar) && resultado.horas.length > 0;
  const outros = APPS.filter((a) => a !== app);
  const abrir = (a: App) => () => { track.abriuAppRota(a); onApp(a); };
  // A cascata só toca quando o conjunto de trechos muda (a chave remonta a lista).
  const chaveTrechos = resultado.trechos.map((t) => t.subprefeituraId).join(',');

  const secundario = (a: App) => (
    <a key={a} href={links[a]} target="_blank" rel="noopener noreferrer" onClick={abrir(a)} className="rota-botao rota-secundario px-2">
      {NOME_APP[a]}<ExternalLink size={14} aria-hidden="true" className="flex-shrink-0 opacity-70" />
    </a>
  );

  return (
    <>
      {comHoras && <FaixaHorasRota horas={resultado.horas} />}

      <ul key={chaveTrechos} className="mt-3 flex flex-col gap-1.5 list-none p-0">
        {resultado.trechos.map((t, i) => (
          <li key={t.subprefeituraId} className="rota-trecho flex items-center gap-2 text-[13.5px]"
            style={{ color: 'var(--text-secondary)', animationDelay: `${Math.min(i * 30, 150)}ms` }}>
            <i aria-hidden="true" className="w-[9px] h-[9px] rounded-full flex-shrink-0" style={{ background: coresParaFaixa(t.faixa).fill }} />
            <span className="min-w-0 truncate">{t.nome}</span>
            {t.alagandoCge
              ? <span className="ml-auto flex-shrink-0 font-semibold" style={{ color: 'var(--text-primary)' }}>Alagando, CGE</span>
              : <span className="ml-auto flex-shrink-0">{labelFaixa(t.faixa)}</span>}
          </li>
        ))}
      </ul>

      {esperar ? (
        <>
          {avisoPedido ? (
            <p role="status" className="rota-aviso-ok rota-texto mt-3.5 px-3">
              <Check size={16} aria-hidden="true" className="flex-shrink-0" />Aviso pedido. Te avisamos quando melhorar.
            </p>
          ) : (
            <button type="button" onClick={onPedirAviso} disabled={avisoIndisponivel} aria-busy={avisoIndisponivel || undefined}
              className="rota-botao rota-primario w-full mt-3.5 px-3 disabled:opacity-70">
              <BellRing size={16} aria-hidden="true" />Me avise quando melhorar
            </button>
          )}
          {/* Quem precisa sair mesmo assim tem os três apps, com peso menor. */}
          <div className="flex flex-wrap items-center justify-center mt-1.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            <span className="mr-0.5">Ir mesmo assim:</span>
            {APPS.map((a) => (
              <a key={a} href={links[a]} target="_blank" rel="noopener noreferrer" onClick={abrir(a)} className="rota-botao rota-sutil">{NOME_APP[a]}</a>
            ))}
          </div>
        </>
      ) : resultado.estado === 'SemDado' ? (
        // Sem leitura não há recomendação para destacar: os apps ficam todos como secundários.
        <div className="grid grid-cols-2 gap-2 mt-3.5">
          <div className="col-span-2 grid">{secundario(app)}</div>
          {outros.map(secundario)}
        </div>
      ) : (
        <>
          <a href={links[app]} target="_blank" rel="noopener noreferrer" onClick={abrir(app)} className="rota-botao rota-primario w-full mt-3.5 px-3">
            <Navigation size={16} aria-hidden="true" className="flex-shrink-0" />Abrir no {NOME_APP[app]}
          </a>
          <div className="grid grid-cols-2 gap-2 mt-2">{outros.map(secundario)}</div>
        </>
      )}
    </>
  );
}
