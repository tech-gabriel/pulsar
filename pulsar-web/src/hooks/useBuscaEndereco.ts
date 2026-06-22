import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import type { EnderecoBusca } from '../types';

const DEBOUNCE_MS = 300;
const MIN_CHARS = 3;

interface UseBuscaEnderecoResult {
  termo: string;
  setTermo: (t: string) => void;
  resultados: EnderecoBusca[];
  carregando: boolean;
  erro: string | null;
  limpar: () => void;
}

/**
 * Busca de endereços com debounce. Dispara o geocoding (via backend) apenas
 * quando o termo tem ao menos MIN_CHARS, ~300ms após a última digitação.
 * Cancela requisições obsoletas para evitar respostas fora de ordem.
 */
export function useBuscaEndereco(): UseBuscaEnderecoResult {
  const [termo, setTermo] = useState('');
  const [resultados, setResultados] = useState<EnderecoBusca[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const limpar = useCallback(() => {
    setTermo('');
    setResultados([]);
    setErro(null);
    setCarregando(false);
  }, []);

  useEffect(() => {
    const t = termo.trim();
    let ativo = true;

    const timer = setTimeout(async () => {
      // Termo curto: limpa o estado e não chama a API.
      if (t.length < MIN_CHARS) {
        if (!ativo) return;
        setResultados([]);
        setErro(null);
        setCarregando(false);
        return;
      }

      setCarregando(true);
      try {
        const { data } = await api.get<EnderecoBusca[]>('/busca/enderecos', {
          params: { q: t },
        });
        if (!ativo) return;
        setResultados(data);
        setErro(null);
      } catch {
        if (!ativo) return;
        setErro('Não foi possível buscar endereços agora.');
        setResultados([]);
      } finally {
        if (ativo) setCarregando(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      ativo = false;
      clearTimeout(timer);
    };
  }, [termo]);

  return { termo, setTermo, resultados, carregando, erro, limpar };
}
