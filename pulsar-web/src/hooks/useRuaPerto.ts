import { useEffect, useState } from 'react';
import { buscarRuaPerto } from '../api/busca';

/**
 * A rua mais perto de um ponto, para o título do cartão do trecho ("Perto da Rua Taquari").
 * Undefined enquanto busca ou sem ponto; null quando não há rua (ou a busca falhou).
 */
export function useRuaPerto(ponto: { lat: number; lon: number } | null): string | null | undefined {
  const chave = ponto ? `${ponto.lat.toFixed(5)},${ponto.lon.toFixed(5)}` : null;
  const [resposta, setResposta] = useState<{ chave: string; rua: string | null } | null>(null);
  useEffect(() => {
    if (!chave || !ponto) return;
    let vivo = true;
    void buscarRuaPerto(ponto.lat, ponto.lon).then((r) => { if (vivo) setResposta({ chave, rua: r?.rua ?? null }); });
    return () => { vivo = false; };
    // O ponto entra pela chave: um objeto novo com as mesmas coordenadas não busca de novo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);
  return resposta && resposta.chave === chave ? resposta.rua : undefined;
}
