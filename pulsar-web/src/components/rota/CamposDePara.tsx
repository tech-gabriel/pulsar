import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowUpDown, BriefcaseBusiness, Building2, Flag, House, Landmark, Loader2, MapPin } from 'lucide-react';
import { useBuscaEndereco } from '../../hooks/useBuscaEndereco';
import { buscarAreas, type Area } from '../../features/cidade/areas';
import type { PontoRota } from '../../features/rota/tipos';
import { normalizarNome } from '../../utils/texto';
import type { LocalSalvoDto, TipoLocal } from '../../types';
import { pontoDoLocal, ROTULO_TIPO } from '../../features/locais/regras';
import { track } from '../../analytics';

type Locais = Partial<Record<TipoLocal, LocalSalvoDto>>;
type SalvarLocal = (tipo: TipoLocal, p: PontoRota) => Promise<boolean>;

const TIPOS: { tipo: TipoLocal; Icone: typeof House; busca: string }[] = [
  { tipo: 'CASA', Icone: House, busca: 'Busque o endereço da sua casa' },
  { tipo: 'TRABALHO', Icone: BriefcaseBusiness, busca: 'Busque o endereço do seu trabalho' },
];

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
  /** Casa e trabalho da conta; sem onSalvarLocal as linhas não aparecem. */
  locais?: Locais;
  onSalvarLocal?: SalvarLocal;
}

function iconePara(tipo: string) {
  if (tipo === 'poi') return Landmark;
  if (tipo === 'address') return MapPin;
  return Building2;
}

interface Opcao { chave: string; rotulo: string; sub?: string; Icone: typeof House; peso: string; acao: () => void }

/** Um campo do De/Para: mostra o ponto escolhido e, ao digitar, sugere subprefeituras e endereços. */
function Campo({ rotulo, ponto, placeholder, areas, onEscolher, focar = false, alvoLista, locais, onSalvarLocal }: {
  rotulo: string; ponto: PontoRota | null; placeholder: string; areas: Area[]; onEscolher: (p: PontoRota) => void; focar?: boolean;
  /** No painel: a lista vai para baixo da cápsula inteira (largura do painel), não para dentro da coluna. */
  alvoLista: HTMLElement | null;
  locais: Locais; onSalvarLocal?: SalvarLocal;
}) {
  const { setTermo, resultados, carregando, limpar } = useBuscaEndereco();
  // null = não está editando: o campo mostra o ponto escolhido.
  const [texto, setTexto] = useState<string | null>(null);
  const [ativo, setAtivo] = useState(-1); // sugestão marcada pelas setas
  // Linhas Casa/Trabalho: abrem no foco; "salvando" = a busca serve para salvar aquele tipo.
  const [linhasAbertas, setLinhasAbertas] = useState(false);
  const [salvando, setSalvando] = useState<TipoLocal | null>(null);
  const idLista = useId();
  const ref = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function fora(e: MouseEvent) {
      const alvo = e.target as Node;
      if (ref.current && !ref.current.contains(alvo) && !listaRef.current?.contains(alvo)) {
        setTexto(null);
        setLinhasAbertas(false);
        setSalvando(null);
      }
    }
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);

  // Fecha tudo e volta a mostrar o ponto escolhido.
  function cancelar() {
    setTexto(null);
    setAtivo(-1);
    setLinhasAbertas(false);
    setSalvando(null);
    limpar();
  }

  function escolher(p: PontoRota) {
    onEscolher(p);
    cancelar();
  }

  async function escolherEndereco(p: PontoRota) {
    if (!salvando) return escolher(p);
    if (await onSalvarLocal?.(salvando, p)) escolher(p);
  }

  function tocarLinha(tipo: TipoLocal) {
    const local = locais[tipo];
    if (local) {
      track.usouLocal(tipo === 'CASA' ? 'casa' : 'trabalho');
      return escolher(pontoDoLocal(local));
    }
    setSalvando(tipo);
    setTexto('');
    setAtivo(-1);
    inputRef.current?.focus();
  }

  const termo = texto?.trim() ?? '';
  const linhas = !!onSalvarLocal && linhasAbertas && !salvando && (texto === null || termo === '' || texto === ponto?.rotulo);
  const subs = termo.length >= 2 && !salvando ? buscarAreas(termo, areas).slice(0, 3) : [];
  // O geocoder também devolve o bairro com o nome da subprefeitura ("Mooca"): não repete.
  const nomesSubs = new Set(subs.map((a) => normalizarNome(a.nome)));
  const enderecos = resultados.filter((r) => !nomesSubs.has(normalizarNome(r.nome || r.descricao)));

  // No foco, Casa e Trabalho; ao digitar, subprefeituras e depois endereços. Uma lista só, para as setas andarem por todas.
  const opcoes: Opcao[] = linhas
    ? TIPOS.map(({ tipo, Icone }) => ({
        chave: `local-${tipo}`, rotulo: ROTULO_TIPO[tipo], sub: locais[tipo]?.rotulo, Icone, peso: 'font-semibold', acao: () => tocarLinha(tipo),
      }))
    : [
        ...subs.map((a) => ({
          chave: `sub-${a.id}`, rotulo: a.nome, Icone: Building2, peso: 'font-semibold',
          acao: () => escolher({ lat: a.latitude, lon: a.longitude, rotulo: a.nome }),
        })),
        ...enderecos.map((r, i) => {
          const p: PontoRota = { lat: r.latitude, lon: r.longitude, rotulo: r.nome || r.descricao, fonte: 'endereco' };
          return { chave: `end-${r.descricao}-${i}`, rotulo: p.rotulo, Icone: iconePara(r.tipo), peso: 'font-medium', acao: () => void escolherEndereco(p) };
        }),
      ];
  const mostrar = (linhas || texto !== null) && opcoes.length > 0;
  // Lista nova (o geocoder respondeu depois): a marca das setas não vale mais, senão o Enter
  // escolheria outra opção no mesmo lugar.
  const assinatura = opcoes.map((o) => o.chave).join('|');
  const [listaDaMarca, setListaDaMarca] = useState(assinatura);
  if (listaDaMarca !== assinatura) {
    setListaDaMarca(assinatura);
    setAtivo(-1);
  }
  const idOpcao = (i: number) => `${idLista}-${i}`;

  function teclar(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      if (texto === null && !linhas) return;
      e.preventDefault();
      cancelar();
      return;
    }
    if (!mostrar) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = opcoes.length;
      const prox = e.key === 'ArrowDown' ? (ativo + 1) % n : (ativo <= 0 ? n - 1 : ativo - 1);
      setAtivo(prox);
      document.getElementById(idOpcao(prox))?.scrollIntoView?.({ block: 'nearest' });
    } else if (e.key === 'Enter' && opcoes[ativo]) {
      e.preventDefault();
      opcoes[ativo].acao();
    }
  }

  const lista = mostrar && (
    // No painel (overflow escondido, altura do conteúdo) a lista fica no fluxo, abaixo da
    // cápsula, para o painel crescer com ela; no celular ela flutua sobre o mapa.
    // mousedown sem padrão: tocar numa linha não tira o foco do campo (o modo salvando segue digitável).
    <ul ref={listaRef} id={idLista} role="listbox" aria-label={`Sugestões para ${rotulo}`} onMouseDown={(e) => e.preventDefault()}
      className={['superficie rounded-2xl mt-1.5 max-h-60 overflow-y-auto', alvoLista ? '' : 'absolute left-0 right-0 z-10'].join(' ')}>
      {opcoes.map(({ chave, rotulo: nome, sub, Icone, peso, acao }, i) => (
        <li key={chave} id={idOpcao(i)} role="option" aria-selected={i === ativo} onClick={acao}
          className={`mapa-item flex w-full items-center gap-2 px-3 py-2.5 text-left cursor-pointer ${linhas ? 'min-h-[52px]' : 'min-h-11'}`}>
          <Icone size={15} className="flex-shrink-0" style={{ color: 'var(--text-accent)' }} aria-hidden="true" />
          {linhas ? (
            <span className="flex flex-col min-w-0">
              <span className={`mapa-txt truncate text-xs ${peso}`}>{nome}</span>
              {sub
                ? <span className="mapa-txt-suave truncate text-xs">{sub}</span>
                : <span className="truncate text-xs font-medium" style={{ color: 'var(--text-accent)' }}>Toque para salvar</span>}
            </span>
          ) : (
            <span className={`mapa-txt truncate text-xs ${peso}`}>{nome}</span>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center rounded-[10px]" style={{ background: 'var(--bg-input)' }}>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={!!mostrar}
          aria-controls={mostrar ? idLista : undefined}
          aria-activedescendant={mostrar && ativo >= 0 ? idOpcao(ativo) : undefined}
          value={texto ?? ponto?.rotulo ?? ''}
          placeholder={TIPOS.find((t) => t.tipo === salvando)?.busca ?? placeholder}
          aria-label={rotulo}
          autoFocus={focar}
          onFocus={(e) => { e.currentTarget.select(); setLinhasAbertas(true); }}
          // Sair para outro elemento (Tab, o outro campo) fecha as linhas e cancela o modo salvando.
          onBlur={(e) => { if (e.relatedTarget) cancelar(); }}
          onKeyDown={teclar}
          onChange={(e) => { setTexto(e.target.value); setTermo(e.target.value); setAtivo(-1); }}
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
export default function CamposDePara({ areas, origem, destino, onOrigem, onDestino, onInverter, onFechar, embutida = false, locais = {}, onSalvarLocal }: Props) {
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
        {/* Os mesmos marcadores do mapa, em miniatura: o "você está aqui" e a chegada com bandeira. */}
        <div aria-hidden="true" className="flex flex-col items-center gap-1.5 flex-shrink-0 w-[18px]">
          <i data-indicador="origem" className="w-3 h-3 rounded-full border-[2.5px] border-white"
            style={{ background: 'var(--color-pulsar-500)', boxShadow: '0 0 0 3px rgb(0 166 244 / .18)' }} />
          <i className="w-0.5 h-[18px]" style={{ background: 'var(--border-glass-hover)' }} />
          <i data-indicador="destino" className="w-[18px] h-[18px] rounded-full flex items-center justify-center" style={{ background: 'var(--color-pulsar-600)' }}>
            <Flag size={10} strokeWidth={2.5} color="#fff" />
          </i>
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1.5 ml-1">
          <Campo rotulo="De" ponto={origem} placeholder="De onde você sai?" areas={areas} onEscolher={onOrigem} alvoLista={alvo}
            locais={locais} onSalvarLocal={onSalvarLocal} />
          <Campo rotulo="Para" ponto={destino} placeholder="Para onde você vai?" areas={areas} onEscolher={onDestino} focar={!destino} alvoLista={alvo}
            locais={locais} onSalvarLocal={onSalvarLocal} />
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
