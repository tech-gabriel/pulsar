import type { FaixaRisco, SubprefeituraMapaDto } from '../../types';
import { faixaChuva, faixaVento, type Camada } from '../../utils/camadas';
import { PALETA } from '../../utils/paleta';
import { motivoDoRisco, resumoAlertas } from '../../utils/risco';

export type CamadaMapa = Camada;
export type Nivel = 'semDado' | 'tranquilo' | 'atencao' | 'alerta';

export interface NivelArea {
  nivel: Nivel;
  /** Índice da faixa de cor da camada (Vento tem 4, as outras 3). */
  banda: number;
  cor: string;
  /** Texto do pulsar ("78", "32°", "61", "4,2"). */
  valor: string | null;
  perigo: 'chuva' | 'calor' | 'vento' | null;
  motivo: string | null;
}

const NIVEL: Record<FaixaRisco, Nivel> = { BAIXO: 'tranquilo', MODERADO: 'atencao', ALTO: 'alerta' };
const BANDA: Record<Nivel, number> = { semDado: 0, tranquilo: 0, atencao: 1, alerta: 2 };
const COR: Record<Nivel, string> = { semDado: PALETA.neutro, tranquilo: '#22C55E', atencao: '#F2C200', alerta: '#D62C2C' };
const PERIGO = { ALAGAMENTO: 'chuva', VENTO: 'vento', CALOR: 'calor' } as const;
const RUMOS = ['norte', 'nordeste', 'leste', 'sudeste', 'sul', 'sudoeste', 'oeste', 'noroeste'];
const CORES_VENTO: string[] = [PALETA.neutro, PALETA.amarelo, PALETA.ambar, PALETA.vermelho];

export function rumo(graus: number | null | undefined): string | null {
  if (graus == null) return null;
  return RUMOS[Math.round((((graus % 360) + 360) % 360) / 45) % 8];
}

export function corDoAnel(corBola: string): string {
  const n = parseInt(corBola.slice(1), 16);
  return '#' + [n >> 16, (n >> 8) & 255, n & 255]
    .map((c) => Math.round(c * 0.78).toString(16).padStart(2, '0')).join('').toUpperCase();
}

const SEM_DADO: NivelArea = { nivel: 'semDado', banda: 0, cor: PALETA.neutro, valor: null, perigo: null, motivo: null };

function montar(nivel: Nivel, valor: string, perigo: NivelArea['perigo'], motivo: string, cor = COR[nivel]): NivelArea {
  return { nivel, banda: BANDA[nivel], cor, valor, perigo, motivo: nivel === 'atencao' || nivel === 'alerta' ? motivo : null };
}

export function nivelDaArea(sub: SubprefeituraMapaDto, camada: CamadaMapa): NivelArea {
  const { scoreAtual, ultimaLeitura: l } = sub;
  if (camada === 'score') {
    if (!scoreAtual) return SEM_DADO;
    const nivel = NIVEL[sub.faixaRisco];
    const motivo = motivoDoRisco({
      faixa: sub.faixaRisco,
      perigoPrincipal: scoreAtual.perigoPrincipal,
      chuva3hMm: scoreAtual.chuva3hMm,
      chuva3hMedidaMm: scoreAtual.chuva3hMedidaMm,
      ventoKmH: l?.ventoKmH,
      sensacaoTermica: l?.sensacaoTermica,
      nome: sub.nome,
    });
    const perigo = scoreAtual.perigoPrincipal ? PERIGO[scoreAtual.perigoPrincipal] : null;
    return { ...montar(nivel, String(Math.round(scoreAtual.valor)), perigo, motivo ?? ''), motivo };
  }
  const comp = scoreAtual?.componentes;
  if (!l || !comp) return SEM_DADO;
  if (camada === 'temperatura') {
    const t = Math.round(l.sensacaoTermica);
    return montar(NIVEL[comp.calor.faixa], `${t}°`, 'calor', `Sensação de ${t} °C`);
  }
  if (camada === 'chuva') {
    const mm = l.chuvaMmH.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return montar(NIVEL[comp.alagamento.faixa], mm, 'chuva', `Chuva de ${mm} mm/h`, faixaChuva(l.chuvaMmH).solida);
  }
  const km = Math.round(l.ventoKmH);
  const cor = faixaVento(l.ventoKmH).solida;
  const de = rumo(l.ventoDirecaoGraus);
  const n = montar(NIVEL[comp.vento.faixa], String(km), 'vento', `Vento de ${km} km/h${de ? `, vindo de ${de}` : ''}`, cor);
  return { ...n, banda: CORES_VENTO.indexOf(cor) };
}

const FAIXA_CASA = { atencao: 'Atenção', alerta: 'Alerta' } as const;

/** A conta dos alertas em versão curta ("1 alerta, 2 atenção"), ou nada quando não há risco. */
function contaCurta(areas: { faixaRisco: string | null }[]): string | null {
  const alertas = areas.filter((r) => r.faixaRisco === 'ALTO').length;
  const atencao = areas.filter((r) => r.faixaRisco === 'MODERADO').length;
  const partes = [alertas > 0 && `${alertas} ${alertas > 1 ? 'alertas' : 'alerta'}`, atencao > 0 && `${atencao} atenção`].filter(Boolean);
  return partes.length ? partes.join(', ') : null;
}

/**
 * A frase do cartão de baixo, em versões da mais longa para a mais curta: o cartão usa a primeira
 * que cabe numa linha (2A, 28/11: nunca cortada nem quebrada). No Vento, o mais forte e de onde vem
 * ("vento de", nunca "rajadas": o número é a média). Nas outras, a conta dos alertas, que nunca diz
 * "tranquilo" sem dado.
 */
export function resumoDoMapa(o: {
  camada: CamadaMapa;
  areas: SubprefeituraMapaDto[];
  carregando: boolean;
  cidadeNome?: string;
  casa?: { nivel: Nivel } | null;
}): string[] {
  const forte = o.camada === 'vento'
    ? o.areas.reduce<SubprefeituraMapaDto | null>((m, a) => (a.ultimaLeitura && a.ultimaLeitura.ventoKmH > (m?.ultimaLeitura?.ventoKmH ?? -1) ? a : m), null)
    : null;
  let bases: string[];
  if (forte?.ultimaLeitura) {
    const de = rumo(forte.ultimaLeitura.ventoDirecaoGraus);
    const km = Math.round(forte.ultimaLeitura.ventoKmH);
    bases = de ? [`Vento de ${de}, até ${km} km/h`, `Vento de até ${km} km/h`] : [`Vento de até ${km} km/h`];
  } else {
    const curta = contaCurta(o.areas);
    bases = [resumoAlertas(o.areas, o.carregando, o.cidadeNome), ...(curta ? [curta] : [])];
  }
  const n = o.casa?.nivel;
  if (n !== 'atencao' && n !== 'alerta') return bases;
  const faixa = FAIXA_CASA[n];
  return [`${bases[0]} · Casa em ${faixa}`, ...bases.map((b) => `${b} · Casa: ${faixa}`)];
}
