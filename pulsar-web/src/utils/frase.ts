/**
 * Das frases (da mais longa para a mais curta), a primeira que cabe na largura. Se nem a última
 * cabe, ela fica com a letra reduzida o necessário, até 80%: o texto nunca é cortado nem quebra.
 */
export function escolherFrase(frases: string[], largura: number | null, medir: (t: string) => number): { texto: string; escala: number } {
  if (largura == null) return { texto: frases[0], escala: 1 };
  const cabe = frases.find((f) => medir(f) <= largura);
  if (cabe) return { texto: cabe, escala: 1 };
  const ultima = frases[frases.length - 1];
  return { texto: ultima, escala: Math.max(0.8, Math.floor((largura / medir(ultima)) * 100) / 100) };
}
