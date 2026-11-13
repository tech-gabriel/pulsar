import { useState, useEffect } from 'react';
import api from '../api/client';
import type { ResumoGradeAreaDto } from '../types';

interface UseResumoGradeResult {
  linhas: ResumoGradeAreaDto[];
  carregando: boolean;
  erro: boolean;
}

/** Comparação do risco por trecho (em teste) com o cálculo atual, nos últimos `dias` dias. */
export function useResumoGrade(dias: number): UseResumoGradeResult {
  const [linhas, setLinhas] = useState<ResumoGradeAreaDto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      setCarregando(true);
      setErro(false);
      try {
        const { data } = await api.get<ResumoGradeAreaDto[]>('/admin/grade/resumo', { params: { dias } });
        if (!cancelado) setLinhas(data);
      } catch {
        if (!cancelado) setErro(true);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [dias]);

  return { linhas, carregando, erro };
}
