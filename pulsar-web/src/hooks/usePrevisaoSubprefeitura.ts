import { useState, useEffect } from 'react';
import api from '../api/client';
import type { FaixaPrevisaoDto } from '../types';

interface UsePrevisaoSubprefeituraResult {
  faixas: FaixaPrevisaoDto[];
  carregando: boolean;
  erro: string | null;
}

/**
 * Faixas de 3h previstas para a subprefeitura (a própria, não o pior caso da zona). Lista vazia é resposta legítima da API,
 * e não erro: significa que ainda não houve coleta ou que a previsão retida já
 * passou. Quem consome renderiza nada nesse caso.
 */
export function usePrevisaoSubprefeitura(subprefeituraId: string | null): UsePrevisaoSubprefeituraResult {
  const [faixas, setFaixas] = useState<FaixaPrevisaoDto[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      if (!subprefeituraId) {
        setFaixas([]);
        return;
      }
      setCarregando(true);
      setErro(null);
      // Limpa antes de buscar: sem isso, ao trocar de
      // subprefeitura a faixa da subprefeitura anterior fica na tela durante a requisição, e
      // previsão de outro lugar passando por desta é pior do que nada.
      setFaixas([]);
      try {
        const { data } = await api.get<FaixaPrevisaoDto[]>(`/subprefeituras/${subprefeituraId}/previsao`);
        if (!cancelado) setFaixas(data);
      } catch {
        // Previsão é complemento, não o conteúdo principal do painel: falhar aqui
        // esconde a faixa em vez de gritar com quem só queria ver o risco atual.
        if (!cancelado) setErro('Não foi possível carregar a previsão.');
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [subprefeituraId]);

  return { faixas, carregando, erro };
}
