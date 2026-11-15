import type { Feature, FeatureCollection, Polygon } from 'geojson';
import type { CelulasAgoraDto, ComponenteScoreDto, FaixaPrevisaoDto, FaixaRisco, TipoPerigo } from '../../types';
import { estiloPoligono } from '../../utils/risco';
import { pontoEmPoligono } from '../../utils/geo';
import { fraseDoRisco } from '../locais/estadoLugar';
import type { Area } from './areas';

/**
 * Um trecho da cidade (hexágono da grade, cerca de 900 m) com o risco de agora. A pessoa
 * nunca vê a palavra hexágono: vê "trecho" e o nome da área.
 */
export interface Trecho {
  h3: string;
  areaId: string;
  /** Risco do trecho: o maior entre o alagamento dele e o vento e o calor da área. */
  valor: number;
  faixa: FaixaRisco;
  perigo: TipoPerigo;
  /** Só o alagamento, que é o que muda de um trecho para outro. */
  alagamento: ComponenteScoreDto;
  /** Estação que mandou na conta do alagamento; null = chuva estimada pelo modelo. */
  estacao: { cod: string; mm1h: number; mm3h: number; distanciaKm: number } | null;
}

/**
 * Os trechos de agora, por índice. O alagamento vem por trecho; vento e calor valem para a
 * área inteira, então entram como na área: assim o trecho nunca parece mais calmo que ela por
 * causa de um perigo que não varia de rua para rua. Maior estrito ganha; empate fica com quem
 * vem antes (alagamento, vento, calor), a mesma regra do score da área no backend.
 */
export function trechosDe(agora: CelulasAgoraDto, areas: Area[]): Map<string, Trecho> {
  const porId = new Map(areas.map((a) => [a.id, a]));
  const trechos = new Map<string, Trecho>();
  for (const c of agora.celulas) {
    const area = porId.get(c.areaId);
    if (!area) continue;
    const alagamento = { valor: c.valor, faixa: c.faixa };
    const comp = area.scoreAtual?.componentes;
    const candidatos: { perigo: TipoPerigo; c: ComponenteScoreDto }[] = [{ perigo: 'ALAGAMENTO', c: alagamento }];
    if (comp) candidatos.push({ perigo: 'VENTO', c: comp.vento }, { perigo: 'CALOR', c: comp.calor });
    const maior = candidatos.reduce((m, x) => (x.c.valor > m.c.valor ? x : m));
    const e = c.estacao !== null ? agora.estacoes[c.estacao] : undefined;
    trechos.set(c.h3, {
      h3: c.h3,
      areaId: c.areaId,
      valor: maior.c.valor,
      faixa: maior.c.faixa,
      perigo: maior.perigo,
      alagamento,
      estacao: e ? { ...e, distanciaKm: c.distanciaKm ?? 0 } : null,
    });
  }
  return trechos;
}

const mm = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** A leitura da estação que mandou no trecho, em uma frase. Fato medido, não estimativa. */
export function fraseDaEstacao(e: NonNullable<Trecho['estacao']>): string {
  const onde = e.distanciaKm < 0.1 ? 'Estação neste trecho' : `Estação a ${mm(e.distanciaKm)} km`;
  if (e.mm1h > 0) return `${onde} mediu ${mm(e.mm1h)} mm na última hora`;
  if (e.mm3h > 0) return `${onde} mediu ${mm(e.mm3h)} mm nas últimas 3 horas`;
  return `${onde} sem chuva nas últimas 3 horas`;
}

/**
 * A frase embaixo do risco do trecho. Com estação perto, a leitura dela: é o que faz o trecho
 * diferente da área (inclusive o trecho tranquilo numa área em Alerta, porque a estação ao lado
 * não marcou chuva). Vento ou calor só tomam a frase quando são eles que põem o trecho em risco.
 * Sem estação, o porquê de sempre, com a faixa e o perigo do trecho.
 */
export function fraseDoTrecho(t: Trecho, area: Area, faixas: FaixaPrevisaoDto[]): string {
  if (t.estacao && (t.perigo === 'ALAGAMENTO' || t.faixa === 'BAIXO')) return fraseDaEstacao(t.estacao);
  const s = area.scoreAtual;
  // Sem estação, o trecho usou o modelo: a frase cita o modelo mesmo com a área pela medida.
  return fraseDoRisco({ ...area, faixaRisco: t.faixa, scoreAtual: s && { ...s, perigoPrincipal: t.perigo, chuva3hMedidaMm: null } }, faixas);
}

/** O trecho que contém o ponto (busca, localização). Null fora da grade ou sem o contorno. */
export function h3DoPonto(lat: number, lon: number, contorno: FeatureCollection | null): string | null {
  const h3 = pontoEmPoligono(lat, lon, contorno)?.properties?.h3;
  return typeof h3 === 'string' ? h3 : null;
}

/**
 * O centro do trecho, para a rota até ele. Média dos vértices do anel (sem o que fecha): no
 * hexágono regular é o centro exato. Null se o trecho não está no contorno.
 */
export function centroDoTrecho(h3: string, contorno: FeatureCollection | null): { lat: number; lon: number } | null {
  const f = contorno?.features.find((x) => x.properties?.h3 === h3);
  if (!f || f.geometry.type !== 'Polygon') return null;
  const anel = f.geometry.coordinates[0].slice(0, -1);
  const lon = anel.reduce((s, p) => s + p[0], 0) / anel.length;
  const lat = anel.reduce((s, p) => s + p[1], 0) / anel.length;
  return { lat, lon };
}

export interface PropsTrecho {
  h3: string;
  faixa: FaixaRisco;
  cor: string;
  opacidade: number;
}

/**
 * O contorno com a cor de cada trecho, para o MapLibre pintar direto das propriedades. Trecho
 * sem risco calculado (área sem leitura) fica sem desenho. A cor e a opacidade são as do
 * polígono da área na mesma faixa: na troca de área para trechos o mapa não muda de tom.
 */
export function montarTrechos(contorno: FeatureCollection, trechos: Map<string, Trecho>): FeatureCollection<Polygon, PropsTrecho> {
  const features: Feature<Polygon, PropsTrecho>[] = [];
  for (const f of contorno.features) {
    const h3 = f.properties?.h3;
    const t = typeof h3 === 'string' ? trechos.get(h3) : undefined;
    if (!t || f.geometry.type !== 'Polygon') continue;
    const estilo = estiloPoligono(t.faixa);
    features.push({ type: 'Feature', geometry: f.geometry, properties: { h3: t.h3, faixa: t.faixa, cor: estilo.fillColor, opacidade: estilo.fillOpacity } });
  }
  return { type: 'FeatureCollection', features };
}
