import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import type { ColetaResultadoDto, MetricasDto, SistemaStatusDto } from '../types';
import { useToast } from '../contexts/ToastContext';

interface UseSistemaAdminResult {
  status: SistemaStatusDto | null;
  metricas: MetricasDto | null;
  carregando: boolean;
  erro: boolean;
  coletando: boolean;
  forcarColeta: () => Promise<void>;
  recarregar: () => void;
}

/** Carrega status da coleta + métricas e permite disparar coleta manual. */
export function useSistemaAdmin(): UseSistemaAdminResult {
  const [status, setStatus] = useState<SistemaStatusDto | null>(null);
  const [metricas, setMetricas] = useState<MetricasDto | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [coletando, setColetando] = useState(false);
  const [versao, setVersao] = useState(0);
  const { showToast } = useToast();

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      setCarregando(true);
      setErro(false);
      try {
        const [s, m] = await Promise.all([
          api.get<SistemaStatusDto>('/admin/sistema/status'),
          api.get<MetricasDto>('/admin/metricas'),
        ]);
        if (!cancelado) {
          setStatus(s.data);
          setMetricas(m.data);
        }
      } catch {
        if (!cancelado) setErro(true);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [versao]);

  const forcarColeta = useCallback(async () => {
    setColetando(true);
    try {
      // A coleta percorre 32 subprefeituras sequencialmente; estende o timeout padrão.
      const { data } = await api.post<ColetaResultadoDto>('/admin/sistema/coletar', null, { timeout: 90000 });
      showToast(`Coleta concluída: ${data.subprefeiturasProcessadas} subprefeituras, ${data.alertasGerados} alertas`, 'success');
      recarregar();
    } catch {
      showToast('Não foi possível concluir a coleta', 'error');
    } finally {
      setColetando(false);
    }
  }, [showToast, recarregar]);

  return { status, metricas, carregando, erro, coletando, forcarColeta, recarregar };
}
