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
