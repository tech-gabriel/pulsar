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
          placeholder="Buscar lugar, rua ou bairro em SP…"
          aria-label="Buscar lugar, rua ou bairro"
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
              mostrarDica ? 'ring-2 ring-pulsar-400/70 animate-pulse' : '',
            ].filter(Boolean).join(' ')}
          >
            {localizando ? <Loader2 size={18} className="animate-spin" /> : <LocateFixed size={18} />}
          </button>
        )}
      </div>

      {onUsarLocalizacao && mostrarDica && (
        <div className="mapa-controle mapa-txt mt-1.5 flex items-center gap-2 px-3 py-2 text-[11px]">
          <LocateFixed size={13} className="mapa-txt-suave flex-shrink-0" />
          <span className="flex-1">Toque no alvo para ver a sua região</span>
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
        <ul className="mapa-controle mt-1.5 max-h-72 overflow-y-auto overflow-x-hidden">
          {erro && <li className="px-3 py-2.5 text-xs" style={{ color: '#EF4444' }}>{erro}</li>}
          {!erro && !carregando && resultados.length === 0 && (
            <li className="mapa-txt-suave px-3 py-2.5 text-xs">
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
                  className="mapa-item flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors"
                >
                  <Icone size={15} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--text-accent)' }} />
                  <span className="min-w-0 leading-snug">
                    <span className="mapa-txt block truncate text-xs font-medium">
                      {r.nome || r.descricao}
                    </span>
                    {contexto && (
                      <span className="mapa-txt-suave block truncate text-[11px]">{contexto}</span>
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
