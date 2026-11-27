import { Fragment, useSyncExternalStore } from 'react';
import { BellRing, Check, ExternalLink, Navigation } from 'lucide-react';
import { track } from '../../analytics';
import { linksNavegacao } from '../../features/rota/links';
import { TEXTO_SERRA } from '../../features/rota/textos';
import type { PontoRota, RotaAvaliacao } from '../../features/rota/tipos';
import type { FaixaRisco } from '../../types';
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
  onCancelarAviso?: () => void;
  onTentarDeNovo?: () => void;
  /** Ponto fora de SP: limpa e foca o campo daquele ponto. */
  onTrocar?: (ponto: 'origem' | 'destino') => void;
  /**
   * Faixa da área inteira, pelo id: a rota olha os trechos do caminho, e a área pode estar pior
   * em outro ponto. A linha diz isso, para o mapa e a rota não parecerem discordar.
   */
  faixaDaArea?: (subprefeituraId: string) => FaixaRisco | null | undefined;
  /** Hora (epoch ms) da última avaliação recebida. */
  atualizadoEm?: number | null;
  /** Nome da área que a pessoa enxerga (nomeDaCobertura), para o aviso de ponto fora. */
  cobertura?: string;
  /** Rota entre cidades (capital ↔ Baixada): só as pontas foram avaliadas, a serra entra como linha. */
  atravessaSerra?: boolean;
  /** O texto da serra pelo sentido (textoSerra); sem ele, o de descer. */
  textoSerra?: string | null;
}

type App = 'google' | 'waze' | 'apple';

const MENSAGEM_ERRO = {
  origemFora: (c: string) => `O ponto de partida fica fora da área coberta (${c}).`,
  destinoFora: (c: string) => `O destino fica fora da área coberta (${c}).`,
  rede: () => 'Não consegui avaliar o caminho agora. Tente de novo em instantes.',
} as const;

const NOME_APP: Record<App, string> = { google: 'Google Maps', waze: 'Waze', apple: 'Apple Maps' };
const APPS: App[] = ['google', 'waze', 'apple'];
const CHAVE_APP_ROTA = 'pulsar-app-rota';

// Quem escuta a troca do app lembrado. A memória vale na sessão mesmo se o armazenamento falhar (aba privada).
const ouvintes = new Set<() => void>();
let appNaMemoria: App | null = null;

const GRAVIDADE: Record<FaixaRisco, number> = { BAIXO: 0, MODERADO: 1, ALTO: 2 };
const maisGrave = (area: FaixaRisco | null | undefined, caminho: FaixaRisco | null | undefined) =>
  !!area && GRAVIDADE[area] > (caminho ? GRAVIDADE[caminho] : -1);

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
export default function PainelRota({ resultado, origem, destino, carregando, erro, avisoPedido, onPedirAviso, avisoIndisponivel = false, onCancelarAviso, onTentarDeNovo, onTrocar, atualizadoEm, faixaDaArea, cobertura = 'São Paulo capital', atravessaSerra = false, textoSerra }: Props) {
  const app = useAppLembrado();

  if (erro) {
    const fora = erro === 'origemFora' ? 'origem' : erro === 'destinoFora' ? 'destino' : null;
    return (
      <div className="mt-3">
        <p role="alert" className="text-sm" style={{ color: 'var(--text-secondary)' }}>{MENSAGEM_ERRO[erro](cobertura)}</p>
        {erro === 'rede' && onTentarDeNovo && (
          <button type="button" onClick={onTentarDeNovo} className="rota-botao rota-secundario px-4 mt-2.5">Tentar de novo</button>
        )}
        {fora && onTrocar && (
          <button type="button" onClick={() => onTrocar(fora)} className="rota-botao rota-secundario px-4 mt-2.5">
            {fora === 'origem' ? 'Trocar a origem' : 'Trocar o destino'}
          </button>
        )}
      </div>
    );
  }
  const pronto = !carregando && resultado && origem && destino;
  if (!carregando && !pronto) return null;

  return (
    <div className="mt-3">
      {/* Mesmo lugar na árvore no carregando e no resultado: o cartão não desmonta, só muda. */}
      <VereditoRota resultado={pronto ? resultado : null} atualizadoEm={atualizadoEm} atravessaSerra={atravessaSerra} />
      {pronto && <Resultado resultado={resultado} links={linksNavegacao(origem, destino)} app={app} onApp={lembrarApp}
        avisoPedido={avisoPedido} onPedirAviso={onPedirAviso} avisoIndisponivel={avisoIndisponivel} onCancelarAviso={onCancelarAviso} faixaDaArea={faixaDaArea} atravessaSerra={atravessaSerra} textoSerra={textoSerra ?? TEXTO_SERRA} />}
    </div>
  );
}

function Resultado({ resultado, links, app, onApp, avisoPedido, onPedirAviso, avisoIndisponivel, onCancelarAviso, faixaDaArea, atravessaSerra, textoSerra }: {
  resultado: RotaAvaliacao; links: Record<App, string>; app: App; onApp: (a: App) => void;
  avisoPedido: boolean; onPedirAviso: () => void; avisoIndisponivel: boolean; onCancelarAviso?: () => void;
  faixaDaArea?: Props['faixaDaArea']; atravessaSerra: boolean; textoSerra: string;
}) {
  // Linha visível da serra: a parte depois dos dois pontos, com maiúscula ("Confira a Ecovias antes de subir").
  const confira = textoSerra.split(': ')[1] ?? textoSerra;
  const linhaSerra = confira.charAt(0).toUpperCase() + confira.slice(1);
  const esperar = resultado.estado === 'Esperar';
  // A previsão por hora só ajuda a saber até quando esperar (16/11/2026).
  const comHoras = esperar && resultado.horas.length > 0;
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
          <Fragment key={t.subprefeituraId}>
          {/* D2 (escolha do user, 18/11/2026): a serra fica entre a saída e a chegada, sem cor de risco. */}
          {atravessaSerra && i === resultado.trechos.length - 1 && i > 0 && (
            <li className="rota-trecho flex items-start gap-2 text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
              <span className="sr-only">{textoSerra}</span>
              <i aria-hidden="true" className="w-[9px] h-[9px] mt-[5px] rounded-full flex-shrink-0" style={{ border: '1.5px dashed var(--text-muted)' }} />
              <span aria-hidden="true" className="min-w-0">Serra do Mar<small className="block text-[12px]" style={{ color: 'var(--text-muted)' }}>{linhaSerra}</small></span>
              <span aria-hidden="true" className="ml-auto flex-shrink-0 text-right">Não avaliada</span>
            </li>
          )}
          <li className="rota-trecho flex items-center gap-2 text-[13.5px]"
            style={{ color: 'var(--text-secondary)', animationDelay: `${Math.min(i * 30, 150)}ms` }}>
            <i aria-hidden="true" className="w-[9px] h-[9px] rounded-full flex-shrink-0" style={{ background: coresParaFaixa(t.faixa).fill }} />
            <span className="min-w-0 truncate">{t.nome}</span>
            {t.alagandoCge
              ? <span className="ml-auto flex-shrink-0 font-semibold" style={{ color: 'var(--text-primary)' }}>Alagando, CGE</span>
              : <span className="ml-auto flex-shrink-0 text-right">{labelFaixa(t.faixa)}{maisGrave(faixaDaArea?.(t.subprefeituraId), t.faixa)
                ? <small className="block text-[11.5px]">{`área em ${labelFaixa(faixaDaArea?.(t.subprefeituraId))}`}</small> : null}</span>}
          </li>
          </Fragment>
        ))}
      </ul>

      {esperar ? (
        <>
          {avisoPedido ? (
            <>
              <p role="status" className="rota-aviso-ok rota-texto mt-3.5 px-3">
                <Check size={16} aria-hidden="true" className="flex-shrink-0" />Aviso pedido. Te avisamos quando melhorar.
              </p>
              {onCancelarAviso && (
                <button type="button" onClick={onCancelarAviso} className="rota-botao rota-secundario w-full mt-2 px-3">Cancelar aviso</button>
              )}
            </>
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
        // O que existe (o CGE) vira uma linha de apoio acima deles.
        <>
          {!resultado.trechos.some((t) => t.alagandoCge) && (
            <p className="mt-3.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>O CGE não registra alagamento no caminho agora.</p>
          )}
          <div className="grid grid-cols-2 gap-2 mt-3.5">
            <div className="col-span-2 grid">{secundario(app)}</div>
            {outros.map(secundario)}
          </div>
        </>
      ) : (
        <>
          <a href={links[app]} target="_blank" rel="noopener noreferrer" onClick={abrir(app)} className="rota-botao rota-primario w-full mt-3.5 px-3">
            <Navigation size={16} aria-hidden="true" className="flex-shrink-0" />Abrir no {NOME_APP[app]}
          </a>
          <div className="grid grid-cols-2 gap-2 mt-2">{outros.map(secundario)}</div>
        </>
      )}
      {/* A linha do mapa só liga saída e chegada pelas áreas do caminho: o trajeto vem do app de navegação. */}
      <p className="mt-2.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>A linha no mapa liga a saída à chegada. O trajeto é o do app que você abrir.</p>
    </>
  );
}
