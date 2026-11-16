import { useState, useRef, useEffect } from 'react';
import { numeroFaltando } from '../../utils/busca';
import { Search, X, MapPin, Landmark, Building2, Loader2, LocateFixed, Route, Hexagon } from 'lucide-react';
import { useBuscaEndereco } from '../../hooks/useBuscaEndereco';
import { useDicaLocalizacao } from '../../hooks/useDicaLocalizacao';
import type { EnderecoBusca } from '../../types';
import BadgeRisco from '../ui/BadgeRisco';
import { buscarAreas, type Area } from '../../features/cidade/areas';

interface Props {
  /** Subprefeituras para achar pelo nome (resultado local, aparece antes dos endereços). */
  areas: Area[];
  onSelecionarArea: (area: Area) => void;
  /** `numeroFaltando`: número que a pessoa digitou e o resultado escolhido não tem (o mapa não conhece). */
  onSelecionar: (endereco: EnderecoBusca, numeroFaltando?: string) => void;
  isMobile: boolean;
  onUsarLocalizacao?: () => void;
  localizando?: boolean;
  /** Abre o modo rota (De/Para). Sem ele o botão de rota não aparece. */
  onAbrirRota?: () => void;
  /** Dentro do painel flutuante (tablet e computador): sem posição própria nem vidro. */
  embutida?: boolean;
  /** Esconde a dica do alvo por ora (outra folha disputa a atenção), sem dispensá-la. */
  semDica?: boolean;
  /**
   * Os trechos acabaram de aparecer e a pessoa ainda não sabe que dá para tocar neles: a faixa
   * de dica fala deles no lugar da dica do alvo, uma vez só.
   */
  dicaTrecho?: boolean;
  onDispensarDicaTrecho?: () => void;
  /**
   * Aviso do ponto buscado (número que o mapa não tem, localização aproximada, fora da área).
   * No celular ele vive aqui, embaixo da busca: o cartão do pé do mapa fica atrás da folha.
   */
  aviso?: string | null;
  /** Texto que o mapa põe no campo (a rua de onde o pino caiu, depois do arraste). */
  textoBusca?: string | null;
  /** Avisa quando a lista de resultados abre e fecha (o convite de alertas sai do caminho). */
  onListaAberta?: (aberta: boolean) => void;
  /** Avisa quando a dica da localização está na tela: o mapa não empilha outro aviso junto. */
  onDicaVisivel?: (visivel: boolean) => void;
}

const MIN_CHARS = 3;

// Ícone por categoria do resultado, para o usuário distinguir lugar × rua × bairro.
const AREAS = new Set(['place', 'neighbourhood', 'locality', 'municipal_district', 'municipality', 'county', 'region', 'subregion', 'postal_code']);

function iconePara(tipo: string) {
  if (tipo === 'poi') return Landmark;
  // Bairro, cidade, distrito: o prédio. Rua e endereço (o MapTiler manda "address", "street", "road"...): o pino.
  if (AREAS.has(tipo)) return Building2;
  return MapPin;
}

// Remove o nome repetido do início da descrição, deixando só o contexto.
function contextoDe(r: EnderecoBusca): string {
  const nome = r.nome?.trim();
  const desc = r.descricao?.trim() ?? '';
  if (nome && desc.toLowerCase().startsWith(nome.toLowerCase())) {
    return desc.slice(nome.length).replace(/^[,\s]+/, '');
  }
  return desc === nome ? '' : desc;
}

/**
 * Busca unificada sobreposta ao mapa (SP3): subprefeituras pelo nome primeiro, depois
 * endereços (geocoding via backend), num campo só.
 */
export default function BuscaUnificada({ areas, onSelecionarArea, onSelecionar, isMobile, onUsarLocalizacao, localizando = false, onAbrirRota, embutida = false, semDica = false, dicaTrecho = false, onDispensarDicaTrecho, aviso = null, textoBusca = null, onListaAberta, onDicaVisivel }: Props) {
  const { termo, setTermo, resultados, carregando, erro, limpar } = useBuscaEndereco();
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dicaLocalizacao = useDicaLocalizacao();
  // Quem já achou o lugar pela busca não precisa da dica do alvo agora (volta numa próxima visita).
  const [buscou, setBuscou] = useState(false);
  const mostrarDica = dicaLocalizacao.mostrarDica && !semDica && !buscou;
  const { dispensar } = dicaLocalizacao;

  // Fecha o dropdown ao clicar fora do componente.
  useEffect(() => {
    function onClickFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener('mousedown', onClickFora);
    return () => document.removeEventListener('mousedown', onClickFora);
  }, []);

  function usarLocalizacao() {
    dispensar();
    onUsarLocalizacao?.();
  }

  function selecionar(endereco: EnderecoBusca) {
    onSelecionar(endereco, numeroFaltando(termo, endereco));
    setBuscou(true);
    setTermo(endereco.nome || endereco.descricao);
    setAberto(false);
  }

  const subs = termo.trim().length >= 2 ? buscarAreas(termo, areas).slice(0, 5) : [];

  function selecionarArea(area: Area) {
    onSelecionarArea(area);
    setBuscou(true);
    setTermo(area.nome);
    setAberto(false);
  }

  // Setas: do campo para a lista e entre os itens (botões de verdade); Escape volta ao campo.
  const listaRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  function andar(e: React.KeyboardEvent, passo: 1 | -1) {
    const itens = [...(listaRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
    if (itens.length === 0) return;
    e.preventDefault();
    const atual = itens.indexOf(document.activeElement as HTMLButtonElement);
    if (atual === 0 && passo === -1) return inputRef.current?.focus();
    itens[atual < 0 ? 0 : Math.min(atual + passo, itens.length - 1)].focus();
  }
  function teclarNaLista(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') andar(e, 1);
    else if (e.key === 'ArrowUp') andar(e, -1);
    else if (e.key === 'Escape') { e.preventDefault(); setAberto(false); inputRef.current?.focus(); }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setAberto(false);
    } else if (e.key === 'ArrowDown') {
      andar(e, 1);
    } else if (e.key === 'Enter' && subs.length > 0) {
      e.preventDefault();
      selecionarArea(subs[0]);
    } else if (e.key === 'Enter' && resultados.length > 0) {
      e.preventDefault();
      selecionar(resultados[0]);
    }
  }

  const mostrarDropdown = aberto && (subs.length > 0 || termo.trim().length >= MIN_CHARS);
  useEffect(() => { onListaAberta?.(mostrarDropdown); }, [mostrarDropdown, onListaAberta]);
  const dicaNaTela = !aviso && !dicaTrecho && !!onUsarLocalizacao && mostrarDica && !mostrarDropdown && !embutida;
  useEffect(() => { onDicaVisivel?.(dicaNaTela); }, [dicaNaTela, onDicaVisivel]);

  // O mapa trocou o texto (pino arrastado): o campo mostra o mesmo lugar que a rota vai usar.
  const [textoAplicado, setTextoAplicado] = useState(textoBusca);
  if (textoBusca !== textoAplicado) {
    setTextoAplicado(textoBusca);
    if (textoBusca) setTermo(textoBusca);
  }

  return (
    <div
      ref={containerRef}
      className={
        embutida ? 'busca-embutida relative z-[5] flex-shrink-0 px-3 pt-3'
          : isMobile ? 'absolute top-[calc(var(--topo-app)+0.5rem)] left-3 right-3 z-[1100]'
          : 'absolute top-[calc(var(--topo-app)+0.5rem)] left-3 z-[1100] w-[340px]'
      }
    >
      {/* Sem padding vertical: a altura vem do próprio input (44px), que é
          também o alvo de toque. Com py-2 a barra passaria de 68px e empurraria
          os controles do mapa. */}
      <div className="mapa-controle flex items-center gap-2 px-3">
        <Search size={18} className="mapa-txt-suave flex-shrink-0" />
        <input
          type="text"
          value={termo}
          onChange={(e) => {
            setTermo(e.target.value);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          onKeyDown={onKeyDown}
          placeholder="Buscar rua ou região"
          aria-label="Buscar subprefeitura ou endereço"
          id="busca-mapa"
          ref={inputRef}
          className="mapa-input flex-1 h-11 bg-transparent text-sm outline-none min-w-0"
        />
        {carregando && (
          <Loader2 size={16} className="mapa-txt-suave animate-spin flex-shrink-0" />
        )}
        {termo && !carregando && (
          <button
            type="button"
            onClick={() => {
              limpar();
              setAberto(false);
            }}
            aria-label="Limpar busca"
            className="mapa-txt-suave flex items-center justify-center w-11 h-11 -my-2 transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        )}
        {onAbrirRota && (
          <button
            type="button"
            onClick={onAbrirRota}
            aria-label="Rota"
            title="Rota"
            className="mapa-txt-suave flex items-center justify-center w-11 h-11 -my-2 rounded-lg flex-shrink-0 transition-colors"
          >
            <Route size={18} aria-hidden="true" />
          </button>
        )}
        {onUsarLocalizacao && (
          <button
            type="button"
            onClick={usarLocalizacao}
            disabled={localizando}
            aria-label="Usar minha localização"
            title="Usar minha localização"
            className={[
              'mapa-txt-suave flex items-center justify-center w-11 h-11 -my-2 rounded-lg flex-shrink-0 transition-colors',
              localizando ? 'cursor-wait' : '',
              // O anel só vem com a frase (celular): sozinho, no computador, parecia o foco do teclado (crítica 8).
              dicaNaTela ? 'ring-2 ring-pulsar-400/70 animate-pulse' : '',
            ].filter(Boolean).join(' ')}
          >
            {localizando ? <Loader2 size={18} className="animate-spin" /> : <LocateFixed size={18} />}
          </button>
        )}
      </div>

      {/* Com os resultados abertos a dica sai, para a lista colar na busca. */}
      {aviso && !mostrarDropdown && !embutida && (
        <div role="status" className="superficie rounded-2xl mapa-txt mt-1.5 flex items-center gap-2 px-3 py-2 text-xs">
          <MapPin size={13} className="mapa-txt-suave flex-shrink-0" />
          <span className="flex-1">{aviso}</span>
        </div>
      )}
      {!aviso && dicaTrecho && !mostrarDropdown && !embutida && (
        <div className="superficie rounded-2xl mapa-txt mt-1.5 flex items-center gap-2 px-3 py-2 text-xs">
          <Hexagon size={13} className="mapa-txt-suave flex-shrink-0" />
          <span className="flex-1">Toque num trecho para ver o risco daquele pedaço</span>
          <button
            type="button"
            onClick={onDispensarDicaTrecho}
            aria-label="Dispensar dica"
            className="mapa-txt-suave flex items-center justify-center w-11 h-11 -my-2 -mr-2 flex-shrink-0 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {dicaNaTela && (
        <div className="superficie rounded-2xl mapa-txt mt-1.5 flex items-center gap-2 px-3 py-2 text-xs">
          <LocateFixed size={13} className="mapa-txt-suave flex-shrink-0" />
          <span className="flex-1">Toque no alvo para ver a sua subprefeitura</span>
          <button
            type="button"
            onClick={dispensar}
            aria-label="Dispensar dica"
            className="mapa-txt-suave flex items-center justify-center w-11 h-11 -my-2 -mr-2 flex-shrink-0 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {mostrarDropdown && (
        <ul ref={listaRef} onKeyDown={teclarNaLista} className="superficie rounded-2xl mt-1.5 max-h-72 overflow-y-auto overflow-x-hidden">
          {subs.length > 0 && (
            <>
              <li className="px-3 pt-2 pb-1 text-[10.5px] font-semibold uppercase tracking-wider mapa-txt-suave">Subprefeituras</li>
              {subs.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => selecionarArea(a)} className="mapa-item flex w-full items-center gap-2 px-3 py-2.5 text-left min-h-11">
                    <span className="min-w-0 flex-1 leading-snug">
                      <span className="mapa-txt block truncate text-xs font-semibold">{a.nome}</span>
                      <span className="mapa-txt-suave block truncate text-xs">{a.zona}</span>
                    </span>
                    <BadgeRisco faixa={a.faixaRisco} size="sm" />
                  </button>
                </li>
              ))}
              {resultados.length > 0 && <li className="px-3 pt-2 pb-1 text-[10.5px] font-semibold uppercase tracking-wider mapa-txt-suave">Endereços</li>}
            </>
          )}
          {erro && <li className="px-3 py-2.5 text-xs" style={{ color: '#EF4444' }}>{erro}</li>}
          {!erro && !carregando && resultados.length === 0 && subs.length === 0 && termo.trim().length >= MIN_CHARS && (
            <li className="mapa-txt-suave px-3 py-2.5 text-xs">
              Nenhuma subprefeitura ou endereço com esse nome.
            </li>
          )}
          {resultados.map((r, i) => {
            const Icone = iconePara(r.tipo);
            const contexto = contextoDe(r);
            return (
              <li key={`${r.descricao}-${i}`}>
                <button
                  type="button"
                  onClick={() => selecionar(r)}
                  className="mapa-item flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors"
                >
                  <Icone size={15} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--text-accent)' }} />
                  <span className="min-w-0 leading-snug">
                    <span className="mapa-txt block truncate text-xs font-medium">
                      {r.nome || r.descricao}
                    </span>
                    {contexto && (
                      <span className="mapa-txt-suave block truncate text-xs">{contexto}</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
