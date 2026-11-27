import type { SubprefeituraMapaDto } from '../../types';
import { nomeAbreviado } from '../../utils/nomesSub';
import { nivelDaArea, type CamadaMapa } from './nivel';

export interface Etiqueta {
  areaId: string;
  nome: string;
  nivel: 'atencao' | 'alerta';
  perigo: 'chuva' | 'calor' | 'vento';
  valor: string;
  motivo: string;
  lon: number;
  lat: number;
}

export interface Caixa { x: number; y: number; w: number; h: number }

/** "4,2" -> 4.2, "32°" -> 32. */
const numero = (valor: string) => parseFloat(valor.replace('°', '').replace(',', '.')) || 0;

export function etiquetasDaCamada(areas: SubprefeituraMapaDto[], camada: CamadaMapa): Etiqueta[] {
  const itens: { e: Etiqueta; n: number }[] = [];
  for (const a of areas) {
    const n = nivelDaArea(a, camada);
    if ((n.nivel !== 'atencao' && n.nivel !== 'alerta') || !n.perigo || n.valor == null || n.motivo == null) continue;
    const nota = camada === 'score' && a.scoreAtual ? a.scoreAtual.valor : numero(n.valor);
    itens.push({
      e: { areaId: a.id, nome: nomeAbreviado(a.nome), nivel: n.nivel, perigo: n.perigo, valor: n.valor, motivo: n.motivo, lon: a.longitude, lat: a.latitude },
      n: nota,
    });
  }
  const peso = (e: Etiqueta) => (e.nivel === 'alerta' ? 1 : 0);
  return itens.sort((x, y) => peso(y.e) - peso(x.e) || y.n - x.n).map((i) => i.e);
}

export function compacta(zoom: number): boolean {
  return zoom < 11.5;
}

export function colocarEtiquetas(
  itens: { etiqueta: Etiqueta; caixa: Caixa }[],
  bloqueios: Caixa[],
  tela: { w: number; h: number },
  folga = 4,
): { mostradas: Etiqueta[]; ocultas: Etiqueta[] } {
  const bate = (a: Caixa, b: Caixa) =>
    a.x < b.x + b.w + folga && b.x < a.x + a.w + folga && a.y < b.y + b.h + folga && b.y < a.y + a.h + folga;
  const fora = (c: Caixa) => c.x < 0 || c.y < 0 || c.x + c.w > tela.w || c.y + c.h > tela.h;
  // Alerta primeiro (sort estável mantém a ordem do chamador dentro do nível).
  const ordem = [...itens].sort((a, b) => Number(b.etiqueta.nivel === 'alerta') - Number(a.etiqueta.nivel === 'alerta'));
  const ocupadas = [...bloqueios];
  const mostradas: Etiqueta[] = [];
  const ocultas: Etiqueta[] = [];
  for (const { etiqueta, caixa } of ordem) {
    if (fora(caixa) || ocupadas.some((o) => bate(caixa, o))) ocultas.push(etiqueta);
    else { ocupadas.push(caixa); mostradas.push(etiqueta); }
  }
  return { mostradas, ocultas };
}
