import type { SubprefeituraMapaDto } from '../types';
import { corLabelFaixa, estiloPoligono, labelFaixa, scoreFormatado } from './risco';

// ── Camadas do mapa (ETAPA 3) ──────────────────────────────────────────────────
// Inspirado no OpenWeatherMap: apenas uma camada ativa por vez. Cada camada
// troca o valor exibido no label, a cor do label e a cor do polígono.

export type Camada = 'score' | 'temperatura' | 'chuva' | 'vento' | 'uv';

export const CAMADAS: { id: Camada; label: string }[] = [
  { id: 'score', label: 'Score' },
  { id: 'temperatura', label: 'Temp' },
  { id: 'chuva', label: 'Chuva' },
  { id: 'vento', label: 'Vento' },
  { id: 'uv', label: 'UV' },
];

/** Estilo resolvido para uma subprefeitura conforme a camada ativa. */
export interface EstiloCamada {
  texto: string; // texto exibido no círculo do label
  corCirculo: string; // cor de fundo do círculo (label)
  fillColor: string; // cor sólida base do polígono
  fillOpacity: number; // opacidade do preenchimento (0.2–0.35)
  borderColor: string; // cor da borda do polígono
  weight: number; // espessura da borda
  pulsa: boolean; // glow pulsante (apenas score alto)
}

// Cada faixa traz a cor do círculo (rgba da spec) + a cor sólida base do
// polígono + a opacidade do preenchimento.
interface FaixaCamada {
  circulo: string;
  solida: string;
  fillOpacity: number;
}

const SEM_DADO: FaixaCamada = {
  circulo: 'rgba(148, 163, 184, 0.85)',
  solida: '#94a3b8',
  fillOpacity: 0.12,
};

function faixaTemperatura(t: number): FaixaCamada {
  if (t <= 10) return { circulo: 'rgba(59, 130, 246, 0.85)', solida: '#3b82f6', fillOpacity: 0.25 };
  if (t <= 20) return { circulo: 'rgba(34, 197, 94, 0.85)', solida: '#22c55e', fillOpacity: 0.2 };
  if (t <= 30) return { circulo: 'rgba(245, 158, 11, 0.85)', solida: '#f59e0b', fillOpacity: 0.3 };
  return { circulo: 'rgba(239, 68, 68, 0.85)', solida: '#ef4444', fillOpacity: 0.35 };
}

function faixaChuva(c: number): FaixaCamada {
  if (c <= 0) return { circulo: 'rgba(148, 163, 184, 0.5)', solida: '#94a3b8', fillOpacity: 0.08 };
  if (c <= 5) return { circulo: 'rgba(59, 130, 246, 0.6)', solida: '#3b82f6', fillOpacity: 0.22 };
  if (c <= 25) return { circulo: 'rgba(59, 130, 246, 0.8)', solida: '#3b82f6', fillOpacity: 0.3 };
  return { circulo: 'rgba(29, 78, 216, 0.9)', solida: '#1d4ed8', fillOpacity: 0.35 };
}

function faixaVento(v: number): FaixaCamada {
  if (v <= 20) return { circulo: 'rgba(148, 163, 184, 0.6)', solida: '#94a3b8', fillOpacity: 0.15 };
  if (v <= 40) return { circulo: 'rgba(234, 179, 8, 0.7)', solida: '#eab308', fillOpacity: 0.25 };
  if (v <= 60) return { circulo: 'rgba(245, 158, 11, 0.8)', solida: '#f59e0b', fillOpacity: 0.3 };
  return { circulo: 'rgba(239, 68, 68, 0.9)', solida: '#ef4444', fillOpacity: 0.35 };
}

function faixaUv(u: number): FaixaCamada {
  if (u <= 2) return { circulo: 'rgba(34, 197, 94, 0.7)', solida: '#22c55e', fillOpacity: 0.2 };
  if (u <= 5) return { circulo: 'rgba(234, 179, 8, 0.7)', solida: '#eab308', fillOpacity: 0.25 };
  if (u <= 7) return { circulo: 'rgba(245, 158, 11, 0.8)', solida: '#f59e0b', fillOpacity: 0.3 };
  if (u <= 10) return { circulo: 'rgba(239, 68, 68, 0.85)', solida: '#ef4444', fillOpacity: 0.35 };
  return { circulo: 'rgba(147, 51, 234, 0.9)', solida: '#9333ea', fillOpacity: 0.35 };
}

// Extratores do valor bruto de cada camada (null quando não há leitura).
function valorTemperatura(sub: SubprefeituraMapaDto): number | null {
  return sub.temperaturaAtual ?? sub.ultimaLeitura?.temperaturaC ?? null;
}
function valorChuva(sub: SubprefeituraMapaDto): number | null {
  return sub.ultimaLeitura?.chuvaMmH ?? null;
}
function valorVento(sub: SubprefeituraMapaDto): number | null {
  return sub.ultimaLeitura?.ventoKmH ?? null;
}
function valorUv(sub: SubprefeituraMapaDto): number | null {
  return sub.ultimaLeitura?.indiceUv ?? null;
}

function semDado(): EstiloCamada {
  return {
    texto: '—',
    corCirculo: SEM_DADO.circulo,
    fillColor: SEM_DADO.solida,
    fillOpacity: SEM_DADO.fillOpacity,
    borderColor: SEM_DADO.solida,
    weight: 1,
    pulsa: false,
  };
}

function montar(texto: string, f: FaixaCamada): EstiloCamada {
  return {
    texto,
    corCirculo: f.circulo,
    fillColor: f.solida,
    fillOpacity: f.fillOpacity,
    borderColor: f.solida,
    weight: f.fillOpacity >= 0.35 ? 2 : 1.5,
    pulsa: false,
  };
}

/** Resolve texto + cores (label e polígono) de uma subprefeitura na camada ativa. */
export function estiloCamada(sub: SubprefeituraMapaDto, camada: Camada): EstiloCamada {
  switch (camada) {
    case 'score': {
      const valor = sub.scoreAtual?.valor;
      if (valor == null) return semDado();
      const est = estiloPoligono(sub.faixaRisco);
      return {
        texto: String(Math.round(valor)),
        corCirculo: corLabelFaixa(sub.faixaRisco),
        fillColor: est.fillColor,
        fillOpacity: est.fillOpacity,
        borderColor: est.color,
        weight: est.weight,
        pulsa: valor > 60,
      };
    }
    case 'temperatura': {
      const t = valorTemperatura(sub);
      if (t == null) return semDado();
      return montar(`${Math.round(t)}°`, faixaTemperatura(t));
    }
    case 'chuva': {
      const c = valorChuva(sub);
      if (c == null) return semDado();
      return montar(c.toFixed(1), faixaChuva(c));
    }
    case 'vento': {
      const v = valorVento(sub);
      if (v == null) return semDado();
      return montar(String(Math.round(v)), faixaVento(v));
    }
    case 'uv': {
      const u = valorUv(sub);
      if (u == null) return semDado();
      return montar(String(Math.round(u)), faixaUv(u));
    }
  }
}

// ── Tooltip: linhas das variáveis, com a ativa em destaque ──────────────────────
export interface LinhaMetrica {
  camada: Camada;
  label: string;
  valor: string;
}

/** Lista das métricas de uma subprefeitura na ordem padrão (score → uv). */
export function metricasSubprefeitura(sub: SubprefeituraMapaDto): LinhaMetrica[] {
  const temp = valorTemperatura(sub);
  const chuva = valorChuva(sub);
  const vento = valorVento(sub);
  const uv = valorUv(sub);
  return [
    { camada: 'score', label: 'Score', valor: `${scoreFormatado(sub.scoreAtual?.valor)} (${labelFaixa(sub.faixaRisco)})` },
    { camada: 'temperatura', label: 'Temperatura', valor: `${temp != null ? temp.toFixed(1) : '—'}°C` },
    { camada: 'chuva', label: 'Chuva', valor: `${chuva != null ? chuva.toFixed(1) : '—'} mm/h` },
    { camada: 'vento', label: 'Vento', valor: `${vento != null ? Math.round(vento) : '—'} km/h` },
    { camada: 'uv', label: 'UV', valor: `${uv != null ? Math.round(uv) : '—'}` },
  ];
}
