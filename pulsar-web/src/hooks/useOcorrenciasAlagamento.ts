import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import type { OcorrenciaAlagamentoDto } from '../types';

interface Resultado {
  ocorrencias: OcorrenciaAlagamentoDto[];
  carregando: boolean;
  erro: string | null;
}

/**
 * Busca as ocorrências de alagamento (últimos 12 meses) na PRIMEIRA vez que o
 * overlay é ligado. Dado quase-estático: cacheia em memória e não re-busca em
 * toggles seguintes.
 */
export function useOcorrenciasAlagamento(ativo: boolean): Resultado {
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaAlagamentoDto[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const buscou = useRef(false);

  useEffect(() => {
    if (!ativo || buscou.current) return;
    buscou.current = true;
    setCarregando(true);
    setErro(null);
    let cancelado = false;
    (async () => {
      try {
        const { data } = await api.get<OcorrenciaAlagamentoDto[]>('/ocorrencias/alagamento');
        if (!cancelado) setOcorrencias(data);
      } catch {
        if (!cancelado) {
          setErro('Não foi possível carregar os alagamentos agora. Tente novamente em instantes.');
          buscou.current = false; // permite nova tentativa num próximo toggle
        }
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => { cancelado = true; };
  }, [ativo]);

  return { ocorrencias, carregando, erro };
}
