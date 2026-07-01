import { useState, useCallback } from 'react';

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

/**
 * Encapsula `navigator.geolocation.getCurrentPosition` como uma Promise, com
 * timeout e erros tipados. Detecção one-shot, em primeiro plano - sem rastreio
 * contínuo. `carregando` fica true enquanto o navegador resolve a posição.
 */
export function useGeolocalizacao() {
  const [carregando, setCarregando] = useState(false);

  const detectar = useCallback(
    () =>
      new Promise<{ lat: number; lon: number }>((resolve, reject) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          reject(new GeoError('sem-suporte'));
          return;
        }
        setCarregando(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setCarregando(false);
            resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          },
          (err) => {
            setCarregando(false);
            const tipo: ErroGeo =
              err.code === err.PERMISSION_DENIED
                ? 'negado'
                : err.code === err.TIMEOUT
                  ? 'timeout'
                  : 'indisponivel';
            reject(new GeoError(tipo));
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
        );
      }),
    [],
  );

  return { detectar, carregando };
}
