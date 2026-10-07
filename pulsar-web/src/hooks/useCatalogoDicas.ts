import { useEffect, useState } from 'react';
import api from '../api/client';
import type { DicaDto } from '../types';

// Catálogo pequeno (~18 dicas) que muda raramente: uma busca por sessão, compartilhada
// entre todos os detalhes abertos. Falha não fica em cache, para a próxima montagem tentar.
let cache: Promise<DicaDto[]> | null = null;

function carregar(): Promise<DicaDto[]> {
  cache ??= api.get<DicaDto[]>('/sugestoes').then((r) => r.data).catch((e: unknown) => {
    cache = null;
    throw e;
  });
  return cache;
}

/** Só para testes. */
export function _limparCacheDicas() {
  cache = null;
}

/** Catálogo de dicas por perigo. Lista vazia enquanto carrega ou se falhar: a dica é complemento. */
export function useCatalogoDicas(): DicaDto[] {
  const [dicas, setDicas] = useState<DicaDto[]>([]);
  useEffect(() => {
    let vivo = true;
    carregar()
      .then((d) => { if (vivo) setDicas(d); })
      .catch(() => { /* sem dicas, sem erro: o detalhe segue sem o bloco */ });
    return () => { vivo = false; };
  }, []);
  return dicas;
}
