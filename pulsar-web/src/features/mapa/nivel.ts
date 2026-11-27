import type { FaixaRisco, SubprefeituraMapaDto } from '../../types';
import { faixaChuva, faixaVento, type Camada } from '../../utils/camadas';
import { PALETA } from '../../utils/paleta';
import { motivoDoRisco } from '../../utils/risco';

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
