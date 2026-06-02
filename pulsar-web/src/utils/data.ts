const formatadorAbsoluto = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const formatadorDataLonga = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** Data/hora absoluta curta, ex.: "02 jun, 08:13". */
export function dataAbsoluta(iso: string): string {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? '' : formatadorAbsoluto.format(data);
}

/** Data/hora completa para tooltip, ex.: "02 de junho de 2026 às 08:13". */
export function dataCompleta(iso: string): string {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? '' : formatadorDataLonga.format(data);
}

/**
 * Tempo relativo em pt-BR ("agora", "há 5 min", "há 3 h", "ontem", "há 4 dias").
 * Para itens com mais de 7 dias, cai para a data absoluta curta.
 */
export function tempoRelativo(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';

  const diffMs = Date.now() - data.getTime();
  const min = Math.round(diffMs / 60_000);

  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;

  const horas = Math.round(min / 60);
  if (horas < 24) return `há ${horas} h`;

  const dias = Math.round(horas / 24);
  if (dias === 1) return 'ontem';
  if (dias < 7) return `há ${dias} dias`;

  return dataAbsoluta(iso);
}
