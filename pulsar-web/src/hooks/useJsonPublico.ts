import { useEffect, useState } from 'react';

/**
 * Arquivo estático de public/ (pontos de alagamento, contorno leve) baixado uma vez, só quando
 * `ativo`: a página pública não paga por ele antes de a pessoa escolher a região.
 */
export function useJsonPublico<T>(url: string, ativo: boolean) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState(false);
  const [pedido, setPedido] = useState(false);
  if (ativo && !pedido) setPedido(true); // dispara uma vez, na primeira ativação

  useEffect(() => {
    if (!pedido) return;
    let valendo = true;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<T>;
      })
      .then((j) => valendo && setDados(j))
      .catch(() => valendo && setErro(true));
    return () => {
      valendo = false;
    };
  }, [pedido, url]);

  return { dados, erro };
}
