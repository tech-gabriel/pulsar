// ── Limpeza do texto vindo do RSS do CGE-SP ───────────────────────────────────
// O feed costuma repetir a manchete inteira como primeira frase do resumo, o
// que faz o card exibir o mesmo texto duas vezes seguidas. Também aparece
// "24,7/C" no lugar de "24,7°C" (a barra é resíduo da codificação do grau).

function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Troca a barra por grau em temperaturas ("24,7/C" → "24,7°C"). */
export function corrigirGraus(texto: string): string {
  return texto.replace(/(\d)\s*\/\s*C\b/g, '$1°C');
}

/**
 * Resumo pronto para exibição: sem a repetição do título e com os graus
 * corrigidos. Devolve `null` quando não sobra conteúdo além da manchete, para
 * o card simplesmente não renderizar o parágrafo.
 */
export function resumoLimpo(titulo: string, resumo: string | null | undefined): string | null {
  if (!resumo) return null;

  let texto = resumo.replace(/\s+/g, ' ').trim();
  const tituloNorm = normalizar(titulo);

  if (tituloNorm && normalizar(texto).startsWith(tituloNorm)) {
    // Corta pelo comprimento do título no texto original (o normalizado só
    // serve para comparar) e remove a pontuação que sobra no começo.
    texto = texto.slice(titulo.replace(/\s+/g, ' ').trim().length).replace(/^[\s.·:;,–-]+/, '');
  }

  texto = corrigirGraus(texto).trim();
  return texto.length > 0 ? texto : null;
}
