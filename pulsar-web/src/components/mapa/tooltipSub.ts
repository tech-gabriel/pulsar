import type { SubprefeituraMapaDto } from '../../types';
import { coresParaFaixa } from '../../utils/risco';

/**
 * HTML do tooltip dark/glass exibido ao passar o mouse sobre o polígono da
 * subprefeitura (ETAPA 3 — redesign). Mostra nome completo, região, score com
 * a cor da faixa e todas as variáveis climáticas. Usado apenas nos polígonos
 * (o label de score é puramente visual), evitando tooltips duplicados.
 */

function fmt(valor: number | null | undefined, casas: number, sufixo = ''): string {
  if (valor == null) return '—';
  return `${valor.toFixed(casas)}${sufixo}`;
}

function linha(emoji: string, label: string, valor: string): string {
  return `<div style="display:flex;justify-content:space-between;font-size:12px;gap:12px;">
    <span style="color:#B8E6FE;">${emoji} ${label}</span>
    <span style="color:#F0F9FF;font-family:'JetBrains Mono',monospace;">${valor}</span>
  </div>`;
}

export function tooltipSubprefeituraHtml(
  sub: SubprefeituraMapaDto | undefined,
  nomeFallback: string,
): string {
  const nome = sub?.nome ?? nomeFallback ?? 'Subprefeitura';

  const cabecalho = `<div style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:600;font-size:14px;color:#F0F9FF;margin-bottom:4px;">${nome}</div>`;

  if (!sub) {
    return `<div style="font-family:'DM Sans',sans-serif;">
      ${cabecalho}
      <div style="font-size:12px;color:#B8E6FE;">Sem dados no momento</div>
    </div>`;
  }

  const l = sub.ultimaLeitura;
  const cor = coresParaFaixa(sub.faixaRisco).fill;
  const score = sub.scoreAtual ? String(Math.round(sub.scoreAtual.valor)) : '—';

  return `<div style="font-family:'DM Sans',sans-serif;">
    ${cabecalho}
    <div style="font-size:11px;color:#B8E6FE;margin-bottom:8px;">Região ${sub.regiaoNome}</div>
    <div style="height:1px;background:linear-gradient(to right, transparent, rgba(0,188,255,0.2), transparent);margin-bottom:8px;"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
      <span style="color:#B8E6FE;font-size:12px;">Score</span>
      <span style="font-family:'JetBrains Mono',monospace;font-weight:700;font-size:16px;color:${cor};">${score}</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:3px;">
      ${linha('🌡', 'Temperatura', fmt(l?.temperaturaC, 1, '°C'))}
      ${linha('🌧', 'Chuva', fmt(l?.chuvaMmH, 1, ' mm/h'))}
      ${linha('💨', 'Vento', l ? `${Math.round(l.ventoKmH)} km/h` : '—')}
      ${linha('👁', 'Visibilidade', fmt(l?.visibilidadeKm, 1, ' km'))}
      ${linha('☀', 'UV', l ? String(Math.round(l.indiceUv)) : '—')}
    </div>
  </div>`;
}
