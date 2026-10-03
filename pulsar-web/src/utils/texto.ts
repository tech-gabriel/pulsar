/**
 * Normaliza um nome para comparação resiliente entre o GeoJSON (MAIÚSCULAS sem
 * acento, ex: "BUTANTA") e o banco (capitalizado com acento, ex: "Butantã").
 * Remove acentos, troca apóstrofos por espaço (o banco usa "M'Boi Mirim" e o
 * GeoJSON "M BOI MIRIM"), coloca em caixa baixa e colapsa espaços.
 */
export function normalizarNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // remove diacríticos combinantes
    .replace(/['’]/g, ' ') // apóstrofo (reto e tipográfico) → espaço
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Primeira opção que cabe em `max` caracteres; se nenhuma couber, a última (a mais
 * curta, por convenção de quem chama). Usado na meta description: acima de ~155
 * caracteres o Google corta com "…" e a frase perde o fim.
 */
export function primeiraQueCabe(opcoes: string[], max = 155): string {
  return opcoes.find((o) => o.length <= max) ?? opcoes[opcoes.length - 1];
}
