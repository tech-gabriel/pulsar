import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import type { QualidadeDadosDto } from '../types';

interface UseQualidadeAdminResult {
  dados: QualidadeDadosDto | null;
  carregando: boolean;
  erro: boolean;
  recarregar: () => void;
}

/** Painel de qualidade dos dados dos últimos `dias` dias. Recarrega quando o período muda. */
export function useQualidadeAdmin(dias: number): UseQualidadeAdminResult {
  const [dados, setDados] = useState<QualidadeDadosDto | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [versao, setVersao] = useState(0);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      setCarregando(true);
      setErro(false);
      try {
        // O backend busca o Open-Meteo na hora (com cache): o primeiro pedido pode demorar.
        const { data } = await api.get<QualidadeDadosDto>('/admin/qualidade', { params: { dias }, timeout: 60000 });
        if (!cancelado) setDados(data);
      } catch {
        if (!cancelado) setErro(true);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [dias, versao]);

  return { dados, carregando, erro, recarregar };
}
