import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import api from '../api/client';
import type { SubprefeituraMapaDto } from '../types';
import { useAuth } from './AuthContext';
import { SubprefeiturasContext } from './SubprefeiturasContext';

const POLL_INTERVAL_MS = 15 * 60 * 1000; // 15 min (mesmo ciclo da coleta)

/**
 * Fonte única das subprefeituras do app logado (mapa, painel, sino, dashboard,
 * histórico): uma chamada a cada 15 min, em vez de cada tela buscar a sua.
 */
export function SubprefeiturasProvider({ children }: { children: ReactNode }) {
  const { estaAutenticado } = useAuth();
  const [subprefeituras, setSubprefeituras] = useState<SubprefeituraMapaDto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);

  const buscar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<SubprefeituraMapaDto[]>('/subprefeituras');
      setSubprefeituras(data);
      setUltimaAtualizacao(new Date());
    } catch {
      setErro('Não foi possível carregar os dados. Verifique sua conexão e tente de novo.');
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

  const value = useMemo(() => ({
    // Deslogado: expõe vazio sem mexer no estado (evita setState no efeito).
    subprefeituras: estaAutenticado ? subprefeituras : [],
    carregando: estaAutenticado ? carregando : false,
    erro: estaAutenticado ? erro : null,
    recarregar: buscar,
    ultimaAtualizacao,
  }), [estaAutenticado, subprefeituras, carregando, erro, buscar, ultimaAtualizacao]);

  return <SubprefeiturasContext.Provider value={value}>{children}</SubprefeiturasContext.Provider>;
}
