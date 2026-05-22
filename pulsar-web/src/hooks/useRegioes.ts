import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import type { RegiaoDto } from '../types';

const POLL_INTERVAL_MS = 15 * 60 * 1000; // 15 min

interface UseRegioesResult {
  regioes: RegiaoDto[];
  carregando: boolean;
  erro: string | null;
  recarregar: () => void;
  ultimaAtualizacao: Date | null;
}

export function useRegioes(): UseRegioesResult {
  const [regioes, setRegioes] = useState<RegiaoDto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);

  const buscar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<RegiaoDto[]>('/regioes');
      setRegioes(data);
      setUltimaAtualizacao(new Date());
    } catch {
      setErro('Não foi possível carregar os dados. Verifique se o backend está ativo.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    buscar();
    const id = setInterval(buscar, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [buscar]);

  return { regioes, carregando, erro, recarregar: buscar, ultimaAtualizacao };
}
