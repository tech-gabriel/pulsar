import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import api from '../api/client';
import type { RegiaoDto } from '../types';
import { useAuth } from './AuthContext';
import { AlertasContext } from './AlertasContext';

const POLL_INTERVAL_MS = 15 * 60 * 1000; // 15 min (mesmo ciclo da coleta)

/**
 * Fonte única dos alertas climáticos (regiões em risco ALTO), compartilhada por
 * todo o app autenticado: alimenta o badge global do sino e o painel de
 * notificações. Só busca quando há sessão e zera ao deslogar.
 */
export function AlertasProvider({ children }: { children: ReactNode }) {
  const { estaAutenticado } = useAuth();
  const [regioes, setRegioes] = useState<RegiaoDto[]>([]);
  const [carregando, setCarregando] = useState(false);

  const buscar = useCallback(async () => {
    setCarregando(true);
    try {
      const { data } = await api.get<RegiaoDto[]>('/regioes');
      setRegioes(data);
    } catch {
      /* silencioso: o badge simplesmente não atualiza desta vez */
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (!estaAutenticado) return;
    void (async () => {
      await buscar();
    })();
    const id = setInterval(buscar, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [estaAutenticado, buscar]);

  const value = useMemo(() => {
    // Deslogado: expõe vazio sem mexer no estado (evita setState no efeito).
    const atuais = estaAutenticado ? regioes : [];
    return {
      regioes: atuais,
      alertas: atuais.filter((r) => r.faixaRisco === 'ALTO'),
      carregando,
      recarregar: buscar,
    };
  }, [estaAutenticado, regioes, carregando, buscar]);

  return <AlertasContext.Provider value={value}>{children}</AlertasContext.Provider>;
}
