import type { DadosCard } from './dadosDoCard';

export type ResultadoCompartilhar = 'nativo' | 'baixado' | 'baixado-sem-link' | 'aberto' | 'aberto-sem-link' | 'cancelado';

// Navegadores embutidos (Instagram, Facebook, TikTok, LINE) ignoram o download de um blob:
// a imagem não salvaria e o aviso mentiria. Lá ela abre numa aba, para tocar e segurar.
const NAVEGADOR_EMBUTIDO = /Instagram|FBAN|FBAV|FB_IAB|musical_ly|TikTok|Line\//i;

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
      const nome = (e as { name?: string }).name;
      if (nome === 'AbortError') return 'cancelado';
      // O navegador só deixa compartilhar logo depois do toque; se a geração passou desse
      // limite (aparelho lento, rede ruim), a imagem existe: cai no baixar e copiar.
      if (nome !== 'NotAllowedError') throw e;
    }
  }
  const url = URL.createObjectURL(png);
  if (NAVEGADOR_EMBUTIDO.test(navigator.userAgent)) {
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return (await copiar(dados.texto)) ? 'aberto' : 'aberto-sem-link';
  }
  const a = document.createElement('a');
  a.href = url;
  a.download = arquivo.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return (await copiar(dados.texto)) ? 'baixado' : 'baixado-sem-link';
}

async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}
