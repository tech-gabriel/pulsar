import type { FaixaPrevisaoDto, PontoAlagamentoCge } from '../../types';
import type { Area } from '../cidade/areas';
import { motivoDoRisco } from '../../utils/risco';
import { fraseChuvaForte } from '../../utils/previsao';
import { ZOOM } from '../../components/mapa/zoom';

/** Na vista ampla, ponto; de perto (a partir do zoom em que os nomes aparecem), etiqueta. */
export function modoDoMarcador(zoom: number): 'ponto' | 'etiqueta' {
  return Math.round(zoom) >= ZOOM.sub ? 'etiqueta' : 'ponto';
}

/** Mesmas faixas do aviso "começou a chover" (LimiaresNotificacao no backend). */
export function intensidadeChuva(mmH: number | null | undefined): 'fraca' | 'moderada' | 'forte' | null {
  if (mmH == null || mmH < 0.5) return null;
  if (mmH < 2.5) return 'fraca';
  if (mmH < 10) return 'moderada';
  return 'forte';
}

export function fraseChuvaAgora(mmH: number | null | undefined, temLeitura: boolean): string {
  if (!temLeitura) return 'Sem leitura agora';
  const i = intensidadeChuva(mmH);
  return i ? `Chuva ${i} agora` : 'Sem chuva agora';
}

/** O CGE não publica coordenada: o alagamento é da região, nunca "a X metros". */
export function fraseAlagamento(pontos: PontoAlagamentoCge[] | undefined, regiao: string): string {
  if (!pontos || pontos.length === 0) return `Nenhum alagamento agora em ${regiao}`;
  const resto = pontos.length - 1;
  return `Alagamento agora: ${pontos[0].via}${resto > 0 ? ` e mais ${resto}` : ''}`;
}

/**
 * A frase embaixo da faixa: com risco, o porquê; sem risco, o que vem pela frente.
 * Lê o relógio aqui dentro, e não no corpo do componente, pela regra de pureza do React Compiler.
 */
export function fraseDoRisco(area: Area, faixas: FaixaPrevisaoDto[]): string {
  const s = area.scoreAtual;
  const l = area.ultimaLeitura;
  const motivo = s && motivoDoRisco({
    faixa: area.faixaRisco, perigoPrincipal: s.perigoPrincipal, chuva3hMm: s.chuva3hMm,
    ventoKmH: l?.ventoKmH, sensacaoTermica: l?.sensacaoTermica,
  });
  if (motivo) return motivo;
  return fraseChuvaForte(faixas, Date.now())
    ?? (faixas.length > 0 ? 'Sem chuva forte nas próximas horas' : 'Nada fora do normal agora');
}
