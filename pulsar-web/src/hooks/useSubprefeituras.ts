import { useState, useEffect } from 'react';
import api from '../api/client';
import type { RegiaoDto, RegiaoDetalheDto, SubprefeituraMapaDto } from '../types';

/**
 * Carrega TODAS as subprefeituras (com score + última leitura) para o mapa.
 * O backend só expõe subprefeituras dentro do detalhe de cada região
 * (GET /api/regioes/{id}), então buscamos os detalhes das regiões em paralelo
 * e achatamos o resultado. Re-busca sempre que a lista de regiões muda
 * (inclusive no polling de 15 min do useRegioes).
 */
export function useSubprefeituras(regioes: RegiaoDto[]): SubprefeituraMapaDto[] {
  const [subprefeituras, setSubprefeituras] = useState<SubprefeituraMapaDto[]>([]);

  useEffect(() => {
    if (regioes.length === 0) {
      setSubprefeituras([]);
      return;
    }

    let cancelado = false;

    Promise.all(
      regioes.map((regiao) =>
        api
          .get<RegiaoDetalheDto>(`/regioes/${regiao.id}`)
          .then(({ data }) => ({ regiao, detalhe: data }))
      )
    )
      .then((resultados) => {
        if (cancelado) return;
        const flat: SubprefeituraMapaDto[] = [];
        for (const { regiao, detalhe } of resultados) {
          for (const sub of detalhe.subprefeituras) {
            flat.push({ ...sub, regiaoId: regiao.id, regiaoNome: regiao.nome });
          }
        }
        setSubprefeituras(flat);
      })
      .catch(() => {
        if (!cancelado) setSubprefeituras([]);
      });

    return () => {
      cancelado = true;
    };
  }, [regioes]);

  return subprefeituras;
}
