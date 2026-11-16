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

/** "Mooca", "Mooca e Penha", "Mooca, Penha e mais 2". */
export function listaNomes(nomes: string[]): string {
  if (nomes.length <= 1) return nomes[0] ?? '';
  if (nomes.length === 2) return `${nomes[0]} e ${nomes[1]}`;
  return `${nomes[0]}, ${nomes[1]} e mais ${nomes.length - 2}`;
}

// Abreviações do CGE no começo do logradouro e no meio do nome ("R Sto Arcadio").
const ABREVIACOES: Record<string, string> = {
  r: 'Rua', av: 'Avenida', tn: 'Túnel', al: 'Alameda', tv: 'Travessa', trav: 'Travessa', pca: 'Praça', pç: 'Praça',
  estr: 'Estrada', rod: 'Rodovia', lgo: 'Largo', vd: 'Viaduto', pte: 'Ponte',
  sto: 'Santo', sta: 'Santa', sao: 'São', dr: 'Doutor', prof: 'Professor', pres: 'Presidente',
  gal: 'General', cel: 'Coronel', eng: 'Engenheiro', mal: 'Marechal', brig: 'Brigadeiro',
};

/** Endereço do CGE por extenso, para ler: "R Sto Arcadio" vira "Rua Santo Arcadio". */
export function porExtenso(endereco: string): string {
  return endereco.replace(/(^|\s)([A-Za-zÀ-ÿ]+)\.?(?=\s|$)/g, (todo, antes: string, palavra: string) => {
    const cheia = ABREVIACOES[palavra.toLowerCase()];
    return cheia ? `${antes}${cheia}` : todo;
  });
}
