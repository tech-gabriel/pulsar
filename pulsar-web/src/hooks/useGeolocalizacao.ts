import { useState, useCallback } from 'react';
import { track } from '../analytics';

export type ErroGeo = 'negado' | 'indisponivel' | 'timeout' | 'sem-suporte';

/** Erro tipado da geolocalização, para a UI escolher a mensagem certa. */
export class GeoError extends Error {
  readonly tipo: ErroGeo;
  constructor(tipo: ErroGeo) {
    super(tipo);
    this.tipo = tipo;
    this.name = 'GeoError';
  }
}

/** Erro (m) a partir do qual a leitura é boa o bastante para parar de refinar. */
const PRECISAO_BOA_M = 50;
/** Tempo máximo refinando antes de entregar a melhor leitura. */
const REFINO_MAX_MS = 10_000;

export interface PontoDetectado {
  lat: number;
  lon: number;
  /** Raio de erro da leitura, em metros (`coords.accuracy`). */
  precisao: number;
}

/**
 * Detecta a posição em primeiro plano, refinando: escuta `watchPosition` e fica
 * com a leitura de menor erro, até ela chegar a PRECISAO_BOA_M ou o tempo acabar
 * (aí entrega a melhor que tiver). Sem leitura nenhuma no prazo → `timeout`.
 * Sempre encerra o watch: não é rastreio contínuo. `carregando` fica true enquanto refina.
 */
export function useGeolocalizacao() {
  const [carregando, setCarregando] = useState(false);

  const detectar = useCallback(
    () =>
      new Promise<PontoDetectado>((resolve, reject) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          reject(new GeoError('sem-suporte'));
          return;
        }
        setCarregando(true);
        let melhor: PontoDetectado | null = null;
        let id: number | undefined = undefined;
        let terminou = false;

        function encerrar() {
          terminou = true;
          clearTimeout(prazo);
          if (id !== undefined) navigator.geolocation.clearWatch(id);
          setCarregando(false);
        }
        function entregar(ponto: PontoDetectado) {
          encerrar();
          track.usouGeolocalizacao(true);
          resolve(ponto);
        }
        function falhar(tipo: ErroGeo) {
          encerrar();
          track.usouGeolocalizacao(false);
          reject(new GeoError(tipo));
        }

        const prazo = setTimeout(
          () => (melhor ? entregar(melhor) : falhar('timeout')),
          REFINO_MAX_MS,
        );
        id = navigator.geolocation.watchPosition(
          (pos) => {
            if (terminou) return;
            const leitura = {
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
              precisao: pos.coords.accuracy,
            };
            if (!melhor || leitura.precisao < melhor.precisao) melhor = leitura;
            if (melhor.precisao <= PRECISAO_BOA_M) entregar(melhor);
          },
          (err) => {
            if (terminou) return;
            // Falha no meio do refino não descarta o que já foi lido.
            if (melhor) return entregar(melhor);
            falhar(
              err.code === err.PERMISSION_DENIED
                ? 'negado'
                : err.code === err.TIMEOUT
                  ? 'timeout'
                  : 'indisponivel',
            );
          },
          { enableHighAccuracy: true, timeout: REFINO_MAX_MS, maximumAge: 0 },
        );
        // O callback pode ter rodado síncrono antes de `id` existir.
        if (terminou) navigator.geolocation.clearWatch(id);
      }),
    [],
  );

  return { detectar, carregando };
}
