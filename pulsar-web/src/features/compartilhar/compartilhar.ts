import type { DadosCard } from './dadosDoCard';

export type ResultadoCompartilhar = 'nativo' | 'baixado' | 'baixado-sem-link' | 'cancelado';

// Fontes do card só no primeiro compartilhar: o app não paga ~60 KB em toda página por
// uma imagem que pouca gente gera. Em public/ por causa do SSG (ver CLAUDE.md).
const FONTES: [string, string, string][] = [
  ['Space Grotesk', '/fonts/space-grotesk-500.woff2', '500'],
  ['Space Grotesk', '/fonts/space-grotesk-700.woff2', '700'],
  ['JetBrains Mono', '/fonts/jetbrains-mono-700.woff2', '700'],
];
let fontes: Promise<void> | null = null;

export function carregarFontesCard(): Promise<void> {
  fontes ??= Promise.all(
    FONTES.map(async ([familia, url, peso]) => {
      const f = new FontFace(familia, `url(${url})`, { weight: peso });
      document.fonts.add(await f.load());
    }),
  )
    .then(() => document.fonts.load('500 30px "JetBrains Mono"'))
    .then(() => undefined)
    .catch((e: unknown) => { fontes = null; throw e; });
  return fontes;
}

export function gerarPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((ok, falha) =>
    canvas.toBlob((b) => (b ? ok(b) : falha(new Error('Canvas não gerou a imagem.'))), 'image/png'));
}

/**
 * Compartilhar nativo com arquivo quando o navegador aceita (celular). Senão, baixa o PNG
 * e copia o texto com o link, para a pessoa colar onde quiser. Cancelar a folha não é erro.
 */
export async function compartilharCard(png: Blob, dados: Pick<DadosCard, 'slug' | 'texto'>): Promise<ResultadoCompartilhar> {
  const arquivo = new File([png], `pulsar-${dados.slug}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], text: dados.texto });
      return 'nativo';
    } catch (e) {
      if ((e as { name?: string }).name === 'AbortError') return 'cancelado';
      throw e;
    }
  }
  const url = URL.createObjectURL(png);
  const a = document.createElement('a');
  a.href = url;
  a.download = arquivo.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  try {
    await navigator.clipboard.writeText(dados.texto);
    return 'baixado';
  } catch {
    return 'baixado-sem-link';
  }
}
