import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import type { NoticiaDto } from '../types';

const POLL_INTERVAL_MS = 15 * 60 * 1000; // 15 min — alinhado ao cache do backend

interface UseNoticiasResult {
  noticias: NoticiaDto[];
  carregando: boolean;
  erro: string | null;
  recarregar: () => void;
  ultimaAtualizacao: Date | null;
}

export function useNoticias(): UseNoticiasResult {
  const [noticias, setNoticias] = useState<NoticiaDto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);

  const buscar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<NoticiaDto[]>('/noticias');
      setNoticias(data);
      setUltimaAtualizacao(new Date());
    } catch {
      setErro('Não foi possível carregar as notícias agora. Tente novamente em instantes.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await buscar();
    })();
    const id = setInterval(buscar, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [buscar]);

  return { noticias, carregando, erro, recarregar: buscar, ultimaAtualizacao };
}
