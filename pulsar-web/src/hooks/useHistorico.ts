import { useState, useEffect } from 'react';
import api from '../api/client';
import type { HistoricoDto } from '../types';

interface UseHistoricoResult {
  historico: HistoricoDto | null;
  carregando: boolean;
  erro: string | null;
}

export function useHistorico(subprefeituraId: string | null, horas = 24): UseHistoricoResult {
  const [historico, setHistorico] = useState<HistoricoDto | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!subprefeituraId) return;

    let cancelado = false;
    void (async () => {
      setCarregando(true);
      setErro(null);
      try {
        const { data } = await api.get<HistoricoDto>(
          `/subprefeituras/${subprefeituraId}/historico`,
          { params: { horas } },
        );
        if (!cancelado) setHistorico(data);
      } catch {
        if (!cancelado) setErro('Não foi possível carregar o histórico.');
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [subprefeituraId, horas]);

  return { historico, carregando, erro };
}
