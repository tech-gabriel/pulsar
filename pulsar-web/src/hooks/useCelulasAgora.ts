import { useEffect, useState } from 'react';
import { buscarCelulasAgora } from '../api/celulas';
import type { CelulasAgoraDto } from '../types';

/**
 * Risco de agora por trecho. Só busca quando `ativo` (mapa aproximado na camada de risco): de
 * longe ninguém vê trecho. Busca de novo quando `versao` muda, que é o mesmo relógio das áreas
 * (a cada coleta): o número da área e as cores dos trechos ficam do mesmo ciclo. Falha não
 * apaga o que já veio; sem nenhum dado, o mapa continua mostrando as áreas.
 */
export function useCelulasAgora(ativo: boolean, versao: number | null): CelulasAgoraDto | null {
  const [dados, setDados] = useState<CelulasAgoraDto | null>(null);

  useEffect(() => {
    if (!ativo) return;
    let valendo = true;
    buscarCelulasAgora()
      .then((d) => valendo && setDados(d))
      .catch(() => { /* fica o último retrato; sem nenhum, ficam as áreas */ });
    return () => {
      valendo = false;
    };
  }, [ativo, versao]);

  return dados;
}
