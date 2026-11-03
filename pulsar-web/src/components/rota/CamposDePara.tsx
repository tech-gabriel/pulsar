import { useEffect, useRef, useState } from 'react';
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
function Campo({ rotulo, ponto, placeholder, areas, onEscolher, focar = false, embutida }: {
  rotulo: string; ponto: PontoRota | null; placeholder: string; areas: Area[]; onEscolher: (p: PontoRota) => void; focar?: boolean; embutida: boolean;
}) {
  const { setTermo, resultados, carregando, limpar } = useBuscaEndereco();
  // null = não está editando: o campo mostra o ponto escolhido.
  const [texto, setTexto] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setTexto(null);
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
      {texto !== null && (subs.length > 0 || enderecos.length > 0) && (
        // No painel (overflow escondido, altura do conteúdo) a lista fica no fluxo para o painel
        // crescer com ela; no celular ela flutua sobre o mapa.
        <ul className={['superficie rounded-2xl mt-1.5 max-h-60 overflow-y-auto', embutida ? '' : 'absolute left-0 right-0 z-10'].join(' ')}>
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
      )}
    </div>
  );
}

/**
 * Barra De/Para do modo rota. No celular substitui a busca do topo; no tablet e no computador
 * abre o painel. Sem localização, o campo De fica vazio e pede um lugar.
 */
export default function CamposDePara({ areas, origem, destino, onOrigem, onDestino, onInverter, onFechar, embutida = false }: Props) {
  return (
    <div className={embutida ? 'busca-embutida relative z-[5] flex-shrink-0 px-3 pt-3'
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
          <Campo rotulo="De" ponto={origem} placeholder="De onde você sai?" areas={areas} onEscolher={onOrigem} embutida={embutida} />
          <Campo rotulo="Para" ponto={destino} placeholder="Para onde você vai?" areas={areas} onEscolher={onDestino} focar={!destino} embutida={embutida} />
        </div>
        <button type="button" onClick={onInverter} aria-label="Inverter origem e destino"
          className="mapa-txt-suave flex items-center justify-center w-11 h-11 flex-shrink-0">
          <ArrowUpDown size={18} />
        </button>
      </div>
    </div>
  );
}
