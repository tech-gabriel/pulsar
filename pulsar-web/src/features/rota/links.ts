import type { PontoRota } from './tipos';



// Modo carro. O Waze só aceita destino (abre a partir da posição do aparelho).
export function linksNavegacao(o: PontoRota, d: PontoRota): { google: string; waze: string; apple: string } {
  const a = `${o.lat},${o.lon}`;
  const b = `${d.lat},${d.lon}`;
  return {
    google: `https://www.google.com/maps/dir/?api=1&origin=${a}&destination=${b}&travelmode=driving`,
    waze: `https://waze.com/ul?ll=${b}&navigate=yes`,
    apple: `https://maps.apple.com/?saddr=${a}&daddr=${b}&dirflg=d`,
  };
}
