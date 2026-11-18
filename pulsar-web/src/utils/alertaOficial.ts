import type { AlertaOficial } from '../types';
import type { Area } from '../features/cidade/areas';

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

export interface LinhaSinoOficial {
  area: Area;
  /** O alerta mais grave da área. */
  alerta: AlertaOficial;
}

/** Uma linha por área com alerta oficial (o mais grave dela): as acompanhadas primeiro, depois o mais grave. */
export function alertasDoSinoOficial(areas: Area[], favoritasIds: string[]): LinhaSinoOficial[] {
  const fav = new Set(favoritasIds);
  return areas
    .filter((a) => (a.alertasOficiais?.length ?? 0) > 0)
    .map((area) => ({ area, alerta: porGravidade(area.alertasOficiais!)[0] }))
    .sort((x, y) =>
      Number(fav.has(y.area.id)) - Number(fav.has(x.area.id))
      || nivelOficial(y.alerta.gravidade).peso - nivelOficial(x.alerta.gravidade).peso
      || x.area.nome.localeCompare(y.area.nome, 'pt-BR'));
}
