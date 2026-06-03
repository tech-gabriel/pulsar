import { useState, useEffect } from 'react';
import api from '../api/client';
import type { RegiaoDetalheDto } from '../types';

interface UseRegiaoDetalheResult {
  regiao: RegiaoDetalheDto | null;
  carregando: boolean;
  erro: string | null;
}

export function useRegiaoDetalhe(regiaoId: string | null): UseRegiaoDetalheResult {
  const [regiao, setRegiao] = useState<RegiaoDetalheDto | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      if (!regiaoId) {
        setRegiao(null);
        return;
      }
      setCarregando(true);
      setErro(null);
      setRegiao(null);
      try {
        const { data } = await api.get<RegiaoDetalheDto>(`/regioes/${regiaoId}`);
        if (!cancelado) setRegiao(data);
      } catch {
        if (!cancelado) setErro('Não foi possível carregar os detalhes da região.');
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [regiaoId]);

  return { regiao, carregando, erro };
}
