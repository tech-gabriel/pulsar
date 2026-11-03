import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Feature, FeatureCollection } from 'geojson';
import { avaliarRota, pedirAvisoRota } from '../api/rota';
import { track } from '../analytics';
import { useToast } from '../contexts/ToastContext';
import { idsDosTrechos, tracarCorredor } from '../features/rota/corredor';
import type { PontoRota, RotaAvaliacao } from '../features/rota/tipos';
import type { SubprefeituraMapaDto } from '../types';
import { coresParaFaixa } from '../utils/risco';
import { normalizarNome } from '../utils/texto';
import { useNotificacoesPrefs } from './useNotificacoesPrefs';
import { usePushSubscription } from './usePushSubscription';

// A API recusa (400) mais de 32 ids; hoje a cidade tem 32 subprefeituras, então é só uma guarda.
const MAX_TRECHOS = 32;

type Erro = 'origemFora' | 'destinoFora' | 'rede';
type Resposta = { chave: string; resultado: RotaAvaliacao | null };

/**
 * Estado da rota no mapa: origem e destino, o corredor em linha reta entre eles, a avaliação
 * da API e a linha colorida por trecho. A avaliação dispara sozinha quando há os dois pontos.
 * Resultado e erro de rede são amarrados à chave do caminho (ids dos trechos): resposta de um
 * destino antigo que chega depois da troca nunca aparece.
 */
export function useRota(geojson: FeatureCollection | null, subs: SubprefeituraMapaDto[]) {
  const [origem, setOrigem] = useState<PontoRota | null>(null); // aceita updater: a localização não atropela quem já digitou
  const [destino, setDestino] = useState<PontoRota | null>(null);
  const [resposta, setResposta] = useState<Resposta | null>(null);
  const [chaveAviso, setChaveAviso] = useState<string | null>(null);
  const { prefs } = useNotificacoesPrefs();
  const push = usePushSubscription(prefs);
  const { showToast } = useToast();

  const corredor = useMemo(
    () => (origem && destino && geojson ? tracarCorredor(origem, destino, geojson) : null),
    [origem, destino, geojson],
  );
  const ids = useMemo(
    () => (corredor?.ok && subs.length > 0 ? idsDosTrechos(corredor.nomes, subs) : []),
    [corredor, subs],
  );
  const erroCorredor: Erro | null = !corredor ? null
    : !corredor.ok ? corredor.motivo
    : subs.length > 0 && (ids.length === 0 || ids.length > MAX_TRECHOS) ? 'destinoFora'
    : null;
  const pronto = !!corredor?.ok && !erroCorredor && ids.length > 0;
  const chave = pronto ? ids.join(',') : null;

  useEffect(() => {
    if (!chave) return;
    let valendo = true;
    avaliarRota(chave.split(','))
      .then((resultado) => valendo && setResposta({ chave, resultado }))
      .catch(() => valendo && setResposta({ chave, resultado: null }));
    return () => {
      valendo = false;
    };
  }, [chave]);

  const atual = chave && resposta?.chave === chave ? resposta : null;
  const resultado = atual?.resultado ?? null;
  const carregando = !!chave && !atual;
  const erro: Erro | null = erroCorredor ?? (atual && !atual.resultado ? 'rede' : null);

  useEffect(() => {
    if (resultado) track.viuVereditoRota(resultado.estado);
  }, [resultado]);

  const linha = useMemo<FeatureCollection | null>(() => {
    if (!corredor?.ok || !origem || !destino) return null;
    const faixaPorNome = new Map((resultado?.trechos ?? []).map((t) => [normalizarNome(t.nome), t.faixa]));
    const trechos: Feature[] = corredor.segmentos.map((seg, i) => {
      // O segmento seguinte começa onde o anterior termina, para a linha não ter vão na divisa.
      const proximo = corredor.segmentos[i + 1]?.coords[0];
      return {
        type: 'Feature',
        properties: { cor: coresParaFaixa(faixaPorNome.get(normalizarNome(seg.nome)) ?? null).fill },
        geometry: { type: 'LineString', coordinates: proximo ? [...seg.coords, proximo] : seg.coords },
      };
    });
    const ponto = (p: PontoRota, papel: 'origem' | 'destino'): Feature => ({
      type: 'Feature', properties: { papel }, geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
    });
    return { type: 'FeatureCollection', features: [...trechos, ponto(origem, 'origem'), ponto(destino, 'destino')] };
  }, [corredor, resultado, origem, destino]);

  const pedirAviso = useCallback(async () => {
    if (!chave || !destino) return;
    try {
      if (push.estado !== 'ativo' && (await push.ativar()) !== 'ativo') {
        showToast('Ligue os avisos para saber quando o caminho melhorar.', 'info');
        return;
      }
      await pedirAvisoRota(chave.split(','), destino.rotulo.slice(0, 80));
      setChaveAviso(chave);
      track.pediuAvisoRota();
    } catch {
      showToast('Não consegui pedir o aviso agora. Tente de novo.', 'error');
    }
  }, [chave, destino, push, showToast]);

  return {
    origem, destino, setOrigem, setDestino,
    resultado, carregando, erro, linha,
    pedirAviso, avisoPedido: !!chave && chaveAviso === chave,
  };
}
