import { useState, useEffect } from 'react';
import api from '../api/client';
import type { FaixaPrevisaoDto } from '../types';

interface UsePrevisaoRegiaoResult {
  faixas: FaixaPrevisaoDto[];
  carregando: boolean;
  erro: string | null;
}

/**
 * Faixas de 3h previstas para a região. Lista vazia é resposta legítima da API,
 * e não erro: significa que ainda não houve coleta ou que a previsão retida já
 * passou. Quem consome renderiza nada nesse caso.
 */
export function usePrevisaoRegiao(regiaoId: string | null): UsePrevisaoRegiaoResult {
  const [faixas, setFaixas] = useState<FaixaPrevisaoDto[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      if (!regiaoId) {
        setFaixas([]);
        return;
      }
      setCarregando(true);
      setErro(null);
      // Limpa antes de buscar, como o useRegiaoDetalhe: sem isso, ao trocar de
      // região a faixa da região anterior fica na tela durante a requisição, e
      // previsão de outro lugar passando por desta é pior do que nada.
      setFaixas([]);
      try {
        const { data } = await api.get<FaixaPrevisaoDto[]>(`/regioes/${regiaoId}/previsao`);
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
  }, [regiaoId]);

  return { faixas, carregando, erro };
}
