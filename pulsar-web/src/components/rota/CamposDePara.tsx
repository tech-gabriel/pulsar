import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowUpDown, Building2, Landmark, Loader2, MapPin } from 'lucide-react';
import { useBuscaEndereco } from '../../hooks/useBuscaEndereco';
import { buscarAreas, type Area } from '../../features/cidade/areas';
import type { PontoRota } from '../../features/rota/tipos';
import { normalizarNome } from '../../utils/texto';

interface Props {
  areas: Area[];
  origem: PontoRota | null;
  destino: PontoRota | null;
  onOrigem: (p: PontoRota) => void;
  onDestino: (p: PontoRota) => void;
  onInverter: () => void;
  onFechar: () => void;
  /** Dentro do painel (tablet e computador): sem posição própria nem vidro. */
  embutida?: boolean;
}

function iconePara(tipo: string) {
  if (tipo === 'poi') return Landmark;
  if (tipo === 'address') return MapPin;
  return Building2;
}

/** Um campo do De/Para: mostra o ponto escolhido e, ao digitar, sugere subprefeituras e endereços. */
function Campo({ rotulo, ponto, placeholder, areas, onEscolher, focar = false, alvoLista }: {
  rotulo: string; ponto: PontoRota | null; placeholder: string; areas: Area[]; onEscolher: (p: PontoRota) => void; focar?: boolean;
  /** No painel: a lista vai para baixo da cápsula inteira (largura do painel), não para dentro da coluna. */
  alvoLista: HTMLElement | null;
}) {
  const { setTermo, resultados, carregando, limpar } = useBuscaEndereco();
  // null = não está editando: o campo mostra o ponto escolhido.
  const [texto, setTexto] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    function fora(e: MouseEvent) {
      const alvo = e.target as Node;
      if (ref.current && !ref.current.contains(alvo) && !listaRef.current?.contains(alvo)) setTexto(null);
    }
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);

  function escolher(p: PontoRota) {
    onEscolher(p);
    setTexto(null);
    limpar();
  }

  const termo = texto?.trim() ?? '';
  const subs = termo.length >= 2 ? buscarAreas(termo, areas).slice(0, 3) : [];
  // O geocoder também devolve o bairro com o nome da subprefeitura ("Mooca"): não repete.
  const nomesSubs = new Set(subs.map((a) => normalizarNome(a.nome)));
  const enderecos = resultados.filter((r) => !nomesSubs.has(normalizarNome(r.nome || r.descricao)));

  const mostrar = texto !== null && (subs.length > 0 || enderecos.length > 0);
  const lista = mostrar && (
    // No painel (overflow escondido, altura do conteúdo) a lista fica no fluxo, abaixo da
    // cápsula, para o painel crescer com ela; no celular ela flutua sobre o mapa.
    <ul ref={listaRef} className={['superficie rounded-2xl mt-1.5 max-h-60 overflow-y-auto', alvoLista ? '' : 'absolute left-0 right-0 z-10'].join(' ')}>
      {subs.map((a) => (
        <li key={a.id}>
          <button type="button" onClick={() => escolher({ lat: a.latitude, lon: a.longitude, rotulo: a.nome })}
            className="mapa-item flex w-full items-center gap-2 px-3 py-2.5 text-left min-h-11">
            <Building2 size={15} className="flex-shrink-0" style={{ color: 'var(--text-accent)' }} aria-hidden="true" />
            <span className="mapa-txt truncate text-xs font-semibold">{a.nome}</span>
          </button>
        </li>
      ))}
      {enderecos.map((r, i) => {
        const Icone = iconePara(r.tipo);
        const nome = r.nome || r.descricao;
        return (
          <li key={`${r.descricao}-${i}`}>
            <button type="button" onClick={() => escolher({ lat: r.latitude, lon: r.longitude, rotulo: nome })}
              className="mapa-item flex w-full items-center gap-2 px-3 py-2.5 text-left min-h-11">
              <Icone size={15} className="flex-shrink-0" style={{ color: 'var(--text-accent)' }} aria-hidden="true" />
              <span className="mapa-txt truncate text-xs font-medium">{nome}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center rounded-[10px]" style={{ background: 'var(--bg-input)' }}>
        <input
          type="text"
          value={texto ?? ponto?.rotulo ?? ''}
          placeholder={placeholder}
          aria-label={rotulo}
          autoFocus={focar}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => { setTexto(e.target.value); setTermo(e.target.value); }}
          className="mapa-input flex-1 min-w-0 h-11 px-2.5 bg-transparent text-sm outline-none"
        />
        {carregando && <Loader2 size={15} className="mapa-txt-suave animate-spin mr-2.5 flex-shrink-0" aria-hidden="true" />}
      </div>
      {alvoLista ? lista && createPortal(lista, alvoLista) : lista}
    </div>
  );
}

/**
 * Barra De/Para do modo rota. No celular substitui a busca do topo; no tablet e no computador
 * abre o painel. Sem localização, o campo De fica vazio e pede um lugar.
 */
export default function CamposDePara({ areas, origem, destino, onOrigem, onDestino, onInverter, onFechar, embutida = false }: Props) {
  // Painel: as sugestões ficam abaixo da cápsula; a seta, os pontos e a troca seguem alinhados aos campos.
  const [alvoLista, setAlvoLista] = useState<HTMLDivElement | null>(null);
  const alvo = embutida ? alvoLista : null;
  return (
    <div data-campos-rota className={embutida ? 'busca-embutida relative z-[5] flex-shrink-0 px-3 pt-3'
      : 'absolute top-[calc(var(--topo-app)+0.5rem)] left-3 right-3 z-[1100]'}>
      <div className="mapa-controle flex items-center gap-1 px-1 py-2">
        <button type="button" onClick={onFechar} aria-label="Fechar a rota"
          className="mapa-txt-suave flex items-center justify-center w-11 h-11 flex-shrink-0">
          <ArrowLeft size={18} />
        </button>
        <div aria-hidden="true" className="flex flex-col items-center gap-[3px] flex-shrink-0">
          <i className="w-2.5 h-2.5 rounded-full border-[2.5px]" style={{ borderColor: 'var(--text-accent)' }} />
          <i className="w-0.5 h-3.5" style={{ background: 'var(--border-glass-hover)' }} />
          <i className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--text-primary)' }} />
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1.5 ml-1">
          <Campo rotulo="De" ponto={origem} placeholder="De onde você sai?" areas={areas} onEscolher={onOrigem} alvoLista={alvo} />
          <Campo rotulo="Para" ponto={destino} placeholder="Para onde você vai?" areas={areas} onEscolher={onDestino} focar={!destino} alvoLista={alvo} />
        </div>
        <button type="button" onClick={onInverter} aria-label="Inverter origem e destino"
          className="mapa-txt-suave flex items-center justify-center w-11 h-11 flex-shrink-0">
          <ArrowUpDown size={18} />
        </button>
      </div>
      {embutida && <div ref={setAlvoLista} />}
    </div>
  );
}
