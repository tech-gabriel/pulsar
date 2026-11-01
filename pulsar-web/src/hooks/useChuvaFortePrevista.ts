import { useEffect, useState } from 'react';
import api from '../api/client';
import { chuvaForte, quando } from '../utils/previsao';
import type { FaixaPrevisaoDto } from '../types';
import type { Area } from '../features/cidade/areas';
import type { ChuvaForteFavorita } from '../components/notificacoes/convite';

// Previsão é por subprefeitura: olhar só as primeiras favoritas segura o número de chamadas.
const MAX_FAVORITAS = 3;

/**
 * A primeira chuva forte prevista nas favoritas, para o convite de alertas dizer o motivo.
 * Só busca quando `ativo` (o convite vai aparecer), e falha em silêncio: sem previsão o
 * convite cai na versão pessoal, que funciona sozinha.
 */
export function useChuvaFortePrevista(favoritas: Area[], ativo: boolean): ChuvaForteFavorita | null {
  const [chuva, setChuva] = useState<ChuvaForteFavorita | null>(null);
  const ids = favoritas.slice(0, MAX_FAVORITAS).map((f) => f.id).join(',');

  useEffect(() => {
    if (!ativo || !ids) return;
    let cancelado = false;
    const alvo = favoritas.slice(0, MAX_FAVORITAS);
    void Promise.allSettled(alvo.map((f) => api.get<FaixaPrevisaoDto[]>(`/subprefeituras/${f.id}/previsao`)))
      .then((res) => {
        if (cancelado) return;
        let melhor: ChuvaForteFavorita | null = null;
        let instante = Infinity;
        res.forEach((r, i) => {
          if (r.status !== 'fulfilled') return;
          const f = r.value.data.find(chuvaForte);
          const t = f ? new Date(f.instantePrevisto).getTime() : Infinity;
          if (f && t < instante) {
            instante = t;
            melhor = { area: { id: alvo[i].id, nome: alvo[i].nome }, quando: quando(f.instantePrevisto, Date.now()), mm: f.chuvaMm };
          }
        });
        setChuva(melhor);
      });
    return () => { cancelado = true; };
    // `ids` resume as favoritas; a lista em si muda de identidade a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, ativo]);

  return chuva;
}
