import type { AlertaOficial } from '../types';
import type { Area } from '../features/cidade/areas';
import { cidadeDaArea } from '../features/cidade/cidade';
import { horaCurta } from './data';

/** Cor do nível na escala da Defesa Civil de SP (amarelo, laranja, vermelho). */
export type CorOficial = 'amarelo' | 'laranja' | 'vermelho';

export interface NivelOficial {
  cor: CorOficial;
  rotulo: string;
  /** Maior = mais grave. */
  peso: number;
}

const NIVEIS: Record<string, NivelOficial> = {
  Extreme: { cor: 'vermelho', rotulo: 'Vermelho', peso: 3 },
  Severe: { cor: 'laranja', rotulo: 'Laranja', peso: 2 },
  Moderate: { cor: 'amarelo', rotulo: 'Amarelo', peso: 1 },
};

/** A severity do CAP vira a cor oficial. Minor e Unknown ficam no amarelo, o nível mais baixo da escala. */
export function nivelOficial(gravidade: string): NivelOficial {
  return NIVEIS[gravidade] ?? { cor: 'amarelo', rotulo: 'Amarelo', peso: 0 };
}

/** O evento como a Defesa Civil escreveu, só sem a caixa alta ("CHUVAS INTENSAS" vira "Chuvas intensas"). */
export function eventoLegivel(evento: string): string {
  const minusculo = evento.trim().toLocaleLowerCase('pt-BR');
  return minusculo.charAt(0).toLocaleUpperCase('pt-BR') + minusculo.slice(1);
}

const UF: Record<string, string> = {
  'acre': 'AC', 'alagoas': 'AL', 'amapá': 'AP', 'amazonas': 'AM', 'bahia': 'BA', 'ceará': 'CE', 'distrito federal': 'DF',
  'espírito santo': 'ES', 'goiás': 'GO', 'maranhão': 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS',
  'minas gerais': 'MG', 'pará': 'PA', 'paraíba': 'PB', 'paraná': 'PR', 'pernambuco': 'PE', 'piauí': 'PI',
  'rio de janeiro': 'RJ', 'rio grande do norte': 'RN', 'rio grande do sul': 'RS', 'rondônia': 'RO', 'roraima': 'RR',
  'santa catarina': 'SC', 'são paulo': 'SP', 'sergipe': 'SE', 'tocantins': 'TO',
};

/** "Defesa Civil Estadual De São Paulo" vira "Defesa Civil Estadual de São Paulo" (só a preposição). */
export function emissorLegivel(emissor: string): string {
  return emissor.replace(/ (De|Do|Da) /g, (m) => m.toLowerCase());
}

/** Para a linha curta: "Defesa Civil Estadual de São Paulo" vira "Defesa Civil de SP". Municipal e nacional ficam como vieram. */
export function emissorCurto(emissor: string): string {
  const estado = /Estadual\s+(?:de|do|da)\s+(.+)$/i.exec(emissor.trim())?.[1];
  const uf = estado ? UF[estado.toLocaleLowerCase('pt-BR')] : undefined;
  return uf ? `Defesa Civil de ${uf}` : emissorLegivel(emissor);
}

/** Mais grave primeiro; no empate, o mais recente. */
export function porGravidade(alertas: AlertaOficial[]): AlertaOficial[] {
  return [...alertas].sort((a, b) =>
    nivelOficial(b.gravidade).peso - nivelOficial(a.gravidade).peso || b.inicioUtc.localeCompare(a.inicioUtc));
}

/**
 * Uma linha do grupo "Defesa Civil" do sino: uma área (com o alerta mais grave dela) ou o resumo
 * das outras áreas de uma cidade sob o mesmo alerta.
 */
export type LinhaSinoOficial =
  | { tipo: 'area'; area: Area; alerta: AlertaOficial }
  | { tipo: 'resumo'; cidade: string; n: number; alerta: AlertaOficial };

/** Até quantas áreas não acompanhadas sob o mesmo alerta aparecem uma por linha antes de virar resumo. */
const MAX_SOLTAS = 3;

/**
 * V1 C (escolha do user, 18/11/2026): as áreas acompanhadas uma por linha, primeiro; as outras com
 * alerta também, até 3 por alerta e cidade; passando disso, uma linha só ("E mais 29 áreas da
 * capital"). O resumo é pelo que a linha mostra (evento, nível e fim), para o vendaval só da Sé não sumir dentro da linha das chuvas
 * da capital inteira. Um alerta para a capital inteira não vira 32 linhas.
 */
export function alertasDoSinoOficial(areas: Area[], favoritasIds: string[]): LinhaSinoOficial[] {
  const fav = new Set(favoritasIds);
  const comAlerta = areas
    .filter((a) => (a.alertasOficiais?.length ?? 0) > 0)
    .map((area) => ({ tipo: 'area' as const, area, alerta: porGravidade(area.alertasOficiais!)[0] }));
  const nome = (l: LinhaSinoOficial) => (l.tipo === 'area' ? l.area.nome : l.cidade);
  const ordem = (x: LinhaSinoOficial, y: LinhaSinoOficial) =>
    nivelOficial(y.alerta.gravidade).peso - nivelOficial(x.alerta.gravidade).peso || nome(x).localeCompare(nome(y), 'pt-BR');

  const suas = comAlerta.filter((l) => fav.has(l.area.id)).sort(ordem);
  const grupos = new Map<string, typeof comAlerta>();
  for (const l of comAlerta.filter((x) => !fav.has(x.area.id))) {
    // Pelo que a linha mostra: alertas iguais em polígonos diferentes não viram linhas repetidas.
    const chave = [cidadeDaArea(l.area), eventoLegivel(l.alerta.evento), nivelOficial(l.alerta.gravidade).rotulo, ateQuando(l.alerta.expiraUtc)].join('|');
    grupos.set(chave, [...(grupos.get(chave) ?? []), l]);
  }
  const resto: LinhaSinoOficial[] = [];
  for (const linhas of grupos.values())
    if (linhas.length <= MAX_SOLTAS) resto.push(...linhas);
    else resto.push({ tipo: 'resumo', cidade: cidadeDaArea(linhas[0].area), n: linhas.length, alerta: linhas[0].alerta });
  return [...suas, ...resto.sort(ordem)];
}

/** "E mais 29 áreas da capital", "E mais 6 áreas da Baixada Santista". */
export function rotuloResumoSino(cidade: string, n: number): string {
  return `E mais ${n} ${n === 1 ? 'área' : 'áreas'} ${cidade === 'São Paulo' ? 'da capital' : `da ${cidade}`}`;
}

const diaMes = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });

/** V2 B (escolha do user, 18/11/2026): "16:18" se for hoje; "21/11, 16:18" se for outro dia. */
export function ateQuando(iso: string, agora: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toDateString() === agora.toDateString() ? horaCurta(iso) : `${diaMes.format(d)}, ${horaCurta(iso)}`;
}
