import { useCallback, useEffect, useState } from 'react';
import type { RiscoAgoraPublico } from '../types';

const ROTA = '/api/publico/risco-agora';
const INTERVALO_MS = 5 * 60 * 1000; // a coleta é de 15 em 15 min; o servidor guarda 5 min

/**
 * Risco agora das 32 subprefeituras para as páginas públicas. Usa fetch, não o axios do app:
 * o interceptor dele trata 401 como sessão expirada e manda para o login, e a página é aberta.
 * Só busca quando `ativo` (depois da escolha da pessoa) e só relê com a aba visível.
 */
export function useRiscoAgora(ativo: boolean) {
  const [dados, setDados] = useState<RiscoAgoraPublico[] | null>(null);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const atualizar = useCallback(() => setTentativa((n) => n + 1), []);

  useEffect(() => {
    if (!ativo) return;
    let valendo = true;
    const buscar = () =>
      fetch(ROTA, { headers: { Accept: 'application/json' } })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json() as Promise<RiscoAgoraPublico[]>;
        })
        .then((j) => {
          if (!valendo) return;
          setDados(j);
          setErro(false);
        })
        // Mantém o que já tinha: melhor um risco de minutos atrás que nenhum.
        .catch(() => valendo && setErro(true));
    void buscar();
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void buscar();
    }, INTERVALO_MS);
    return () => {
      valendo = false;
      window.clearInterval(id);
    };
  }, [ativo, tentativa]);

  return { dados, erro, atualizar };
}
