import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Feature, FeatureCollection } from 'geojson';
import { avaliarRota, cancelarAvisoRota, pedirAvisoRota, type Coordenada } from '../api/rota';
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
export const REAVALIAR_MS = 5 * 60_000;

export const ROTULO_LOCALIZACAO = 'Minha localização';

/**
 * O caminho como texto: ids dos trechos, origem e destino. O risco é lido nos trechos por onde a
 * reta passa, então outro ponto dentro da mesma subprefeitura é outro caminho.
 */
const chaveDoCaminho = (ids: string[], origem: Coordenada, destino: Coordenada) =>
  `${ids.join(',')}|${origem.lat},${origem.lon}|${destino.lat},${destino.lon}`;

function caminhoDaChave(chave: string): { ids: string[]; origem: Coordenada; destino: Coordenada } {
  const [ids, origem, destino] = chave.split('|');
  const ponto = (texto: string): Coordenada => {
    const [lat, lon] = texto.split(',').map(Number);
    return { lat, lon };
  };
  return { ids: ids.split(','), origem: ponto(origem), destino: ponto(destino) };
}

const TEXTO_PUSH: Record<string, string> = {
  indisponivel: 'Este aparelho não recebe avisos. No iPhone, instale o Pulsar na tela de início.',
  negado: 'Permita as notificações do Pulsar no navegador para receber o aviso.',
  inativo: 'Ligue os avisos para saber quando o caminho melhorar.',
};

type Erro = 'origemFora' | 'destinoFora' | 'rede';
type Resposta = { chave: string; resultado: RotaAvaliacao | null; em: number };

/**
 * Estado da rota no mapa: origem e destino, o corredor em linha reta entre eles, a avaliação
 * da API e a linha colorida por trecho. A avaliação dispara sozinha quando há os dois pontos.
 * Resultado e erro de rede são amarrados à chave do caminho (ids dos trechos e os dois pontos): resposta de um
 * destino antigo que chega depois da troca nunca aparece.
 * `aberta`: o push só é consultado com a rota aberta (abrir o mapa não busca a chave VAPID).
 */
export function useRota(geojson: FeatureCollection | null, subs: SubprefeituraMapaDto[], aberta = true) {
  const [origem, setOrigem] = useState<PontoRota | null>(null); // aceita updater: a localização não atropela quem já digitou
  const [destino, setDestino] = useState<PontoRota | null>(null);
  const [resposta, setResposta] = useState<Resposta | null>(null);
  const [chaveAviso, setChaveAviso] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0); // "Tentar de novo" refaz a avaliação da mesma chave
  const { prefs } = useNotificacoesPrefs();
  const push = usePushSubscription(prefs, aberta);
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
  const chave = pronto && origem && destino ? chaveDoCaminho(ids, origem, destino) : null;

  useEffect(() => {
    if (!chave) return;
    let valendo = true;
    const caminho = caminhoDaChave(chave);
    avaliarRota(caminho.ids, caminho.origem, caminho.destino)
      .then((resultado) => valendo && setResposta({ chave, resultado, em: Date.now() }))
      // Falha numa reavaliação de fundo mantém o resultado que já estava na tela.
      .catch(() => valendo && setResposta((r) => (r?.chave === chave && r.resultado ? r : { chave, resultado: null, em: Date.now() })));
    return () => {
      valendo = false;
    };
  }, [chave, tentativa]);

  const tentarDeNovo = useCallback(() => {
    setResposta(null);
    setTentativa((n) => n + 1);
  }, []);

  const atual = chave && resposta?.chave === chave ? resposta : null;
  const resultado = atual?.resultado ?? null;
  const carregando = !!chave && !atual;
  const erro: Erro | null = erroCorredor ?? (atual && !atual.resultado ? 'rede' : null);
  const temResultado = !!resultado;

  // Com o resultado na tela, reavalia a cada 5 min sem limpar nada (a cor só transiciona).
  // Aba oculta não gasta chamada: o ciclo que caiu nela roda quando a aba volta.
  useEffect(() => {
    if (!chave || !temResultado) return;
    let pendente = false;
    const reavaliar = () => setTentativa((n) => n + 1);
    const id = window.setInterval(() => {
      if (document.hidden) pendente = true;
      else reavaliar();
    }, REAVALIAR_MS);
    const aoVoltar = () => {
      if (document.hidden || !pendente) return;
      pendente = false;
      reavaliar();
    };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, [chave, temResultado]);

  // Conta o veredito uma vez por caminho e estado: a reavaliação de 5 min traz um resultado novo
  // com o mesmo estado, que não é uma visita nova.
  const vistoRef = useRef<string | null>(null);
  useEffect(() => {
    if (!resultado || !chave) return;
    const visto = `${chave}:${resultado.estado}`;
    if (vistoRef.current === visto) return;
    vistoRef.current = visto;
    track.viuVereditoRota(resultado.estado);
  }, [chave, resultado]);

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
    // subId: no modo rota o mapa esconde o número da subprefeitura de saída e de chegada, que cobriria o ponto.
    const ponto = (p: PontoRota, papel: 'origem' | 'destino', subId: string | undefined): Feature => ({
      type: 'Feature', properties: { papel, subId }, geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
    });
    return { type: 'FeatureCollection', features: [...trechos, ponto(origem, 'origem', ids[0]), ponto(destino, 'destino', ids[ids.length - 1])] };
  }, [corredor, resultado, origem, destino, ids]);

  const pedirAviso = useCallback(async () => {
    if (!chave || !destino) return;
    try {
      if (push.estado !== 'ativo') {
        const estado = push.estado === 'inativo' ? await push.ativar() : push.estado;
        if (estado !== 'ativo') {
          showToast(TEXTO_PUSH[estado] ?? TEXTO_PUSH.inativo, 'info');
          return;
        }
      }
      // Push ligado com todos os tipos de aviso desligados no aparelho: o servidor não mandaria nada.
      if (!prefs.alertaModerado && !prefs.alertaAlto && !prefs.resumoDiario) {
        showToast('Ligue algum tipo de aviso em Configurações para receber quando o caminho melhorar.', 'info');
        return;
      }
      // "Minha localização" não diz nada no push: usa o nome da última subprefeitura do caminho.
      const rotulo = destino.rotulo === ROTULO_LOCALIZACAO
        ? resultado?.trechos[resultado.trechos.length - 1]?.nome ?? destino.rotulo
        : destino.rotulo;
      const caminho = caminhoDaChave(chave);
      await pedirAvisoRota(caminho.ids, rotulo.slice(0, 80), caminho.origem, caminho.destino);
      setChaveAviso(chave);
      track.pediuAvisoRota();
    } catch {
      showToast('Não consegui pedir o aviso agora. Tente de novo.', 'error');
    }
  }, [chave, destino, push, prefs, resultado, showToast]);

  const cancelarAviso = useCallback(async () => {
    try {
      await cancelarAvisoRota();
      setChaveAviso(null);
    } catch {
      showToast('Não consegui cancelar o aviso agora. Tente de novo.', 'error');
    }
  }, [showToast]);

  return {
    origem, destino, setOrigem, setDestino,
    resultado, atualizadoEm: atual?.resultado ? atual.em : null, carregando, erro, linha,
    tentarDeNovo, avisoIndisponivel: push.estado === 'carregando',
    pedirAviso, cancelarAviso, avisoPedido: !!chave && chaveAviso === chave,
  };
}
