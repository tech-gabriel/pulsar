import { useState, useRef, useEffect } from 'react';
import { Search, X, MapPin, Landmark, Building2, Loader2, LocateFixed } from 'lucide-react';
import { useBuscaEndereco } from '../../hooks/useBuscaEndereco';
import { useDicaLocalizacao } from '../../hooks/useDicaLocalizacao';
import type { EnderecoBusca } from '../../types';

interface Props {
  onSelecionar: (endereco: EnderecoBusca) => void;
  isMobile: boolean;
  onUsarLocalizacao?: () => void;
  localizando?: boolean;
}

// Glassmorphism alinhado ao LayerControl/legenda do mapa.
const CARD: React.CSSProperties = {
  background: 'rgba(5, 47, 74, 0.7)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(0, 188, 255, 0.12)',
  borderRadius: 12,
};

const MIN_CHARS = 3;

// Ícone por categoria do resultado, para o usuário distinguir lugar × rua × bairro.
function iconePara(tipo: string) {
  if (tipo === 'poi') return Landmark;
  if (tipo === 'address') return MapPin;
  return Building2; // place, neighbourhood, locality, municipal_district…
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
 * Caixa de busca de endereços sobreposta ao mapa, com autocomplete. Resolve o
 * endereço (geocoding via backend) e devolve o ponto selecionado via callback.
 */
export default function BuscaEndereco({ onSelecionar, isMobile, onUsarLocalizacao, localizando = false }: Props) {
  const { termo, setTermo, resultados, carregando, erro, limpar } = useBuscaEndereco();
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { mostrarDica, dispensar } = useDicaLocalizacao();

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
    onSelecionar(endereco);
    setTermo(endereco.nome || endereco.descricao);
    setAberto(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setAberto(false);
    } else if (e.key === 'Enter' && resultados.length > 0) {
      e.preventDefault();
      selecionar(resultados[0]);
    }
  }

  const mostrarDropdown = aberto && termo.trim().length >= MIN_CHARS;

  return (
    <div
      ref={containerRef}
      className={
        isMobile
          ? 'absolute top-3 left-3 right-3 z-[1100]'
          : 'absolute top-3 left-3 z-[1100] w-[340px]'
      }
    >
      <div className="flex items-center gap-2 px-3 py-2" style={CARD}>
        <Search size={18} className="text-pulsar-300 flex-shrink-0" />
        <input
          type="text"
          value={termo}
          onChange={(e) => {
            setTermo(e.target.value);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          onKeyDown={onKeyDown}
          placeholder="Buscar lugar, rua ou bairro em SP…"
          aria-label="Buscar lugar, rua ou bairro"
          className="flex-1 bg-transparent text-sm text-white placeholder:text-pulsar-300/60 outline-none min-w-0"
        />
        {carregando && (
          <Loader2 size={16} className="text-pulsar-300 animate-spin flex-shrink-0" />
        )}
        {termo && !carregando && (
          <button
            type="button"
            onClick={() => {
              limpar();
              setAberto(false);
            }}
            aria-label="Limpar busca"
            className="text-pulsar-300 hover:text-white transition-colors flex-shrink-0"
          >
            <X size={16} />
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
              'flex-shrink-0 transition-colors',
              localizando ? 'text-pulsar-300 cursor-wait' : 'text-pulsar-300 hover:text-white',
              mostrarDica ? 'ring-2 ring-pulsar-400/70 rounded-lg animate-pulse' : '',
            ].filter(Boolean).join(' ')}
          >
            {localizando ? <Loader2 size={18} className="animate-spin" /> : <LocateFixed size={18} />}
          </button>
        )}
      </div>

      {onUsarLocalizacao && mostrarDica && (
        <div className="mt-1.5 flex items-center gap-2 px-3 py-2 text-[11px] text-pulsar-100" style={CARD}>
          <LocateFixed size={13} className="flex-shrink-0 text-pulsar-300" />
          <span className="flex-1">Toque no alvo para ver a sua região</span>
          <button
            type="button"
            onClick={dispensar}
            aria-label="Dispensar dica"
            className="flex-shrink-0 text-pulsar-300 hover:text-white transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {mostrarDropdown && (
        <ul className="mt-1.5 max-h-72 overflow-y-auto overflow-x-hidden" style={CARD}>
          {erro && <li className="px-3 py-2.5 text-xs text-red-300">{erro}</li>}
          {!erro && !carregando && resultados.length === 0 && (
            <li className="px-3 py-2.5 text-xs text-pulsar-300/70">
              Nada encontrado. Tente o nome de um lugar, rua ou bairro.
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
                  className="flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors hover:bg-pulsar-700/40"
                >
                  <Icone size={15} className="mt-0.5 flex-shrink-0 text-pulsar-400" />
                  <span className="min-w-0 leading-snug">
                    <span className="block truncate text-xs font-medium text-pulsar-50">
                      {r.nome || r.descricao}
                    </span>
                    {contexto && (
                      <span className="block truncate text-[11px] text-pulsar-300/80">{contexto}</span>
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
