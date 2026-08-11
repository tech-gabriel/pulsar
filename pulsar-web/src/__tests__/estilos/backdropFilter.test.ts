import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { transform, Features } from 'lightningcss';

// Este teste roda o minificador de verdade sobre o index.css de verdade. Ele
// existe porque o jsdom não aplica folha de estilo externa: o desfoque das
// superfícies de vidro sumiu de produção com a suíte inteira verde.
//
// O que quebrou: declarar `backdrop-filter` e logo abaixo `-webkit-backdrop-filter`
// faz o Lightning CSS colapsar o par e manter SÓ o alias `-webkit-`, que o
// Chrome moderno não reconhece mais (CSS.supports('-webkit-backdrop-filter', ...)
// é false no Chrome 151). Escrevendo só a propriedade padrão, o Lightning CSS
// gera o par correto sozinho a partir dos targets.
//
// Os targets abaixo são os que o @tailwindcss/node passa ao Lightning CSS ao
// otimizar o CSS gerado (safari 16.4, iOS 16.4, firefox 128, chrome 111). O
// Tailwind não lê browserslist, então não há como derivá-los do projeto.
const targets = {
  safari: (16 << 16) | 1024,
  ios_saf: (16 << 16) | 1024,
  firefox: 128 << 16,
  chrome: 111 << 16,
};

// `import.meta.url` não é file:// sob o transform do vitest, então o caminho sai
// do cwd, que é a raiz do repo ou a de pulsar-web dependendo de onde se roda.
const raizWeb = process.cwd().endsWith('pulsar-web')
  ? process.cwd()
  : resolve(process.cwd(), 'pulsar-web');

const indexCss = readFileSync(resolve(raizWeb, 'src/index.css'), 'utf8');

function minificar(css: string): string {
  const { code } = transform({
    filename: 'index.css',
    code: Buffer.from(css),
    minify: true,
    drafts: { customMedia: true },
    nonStandard: { deepSelectorCombinator: true },
    include: Features.Nesting | Features.MediaQueries,
    exclude: Features.LogicalProperties | Features.DirSelector | Features.LightDark,
    targets,
    errorRecovery: true,
  });
  return code.toString();
}

const ocorrencias = (css: string, re: RegExp) => (css.match(re) ?? []).length;
const PADRAO = /(?<!-)\bbackdrop-filter:/g;
const WEBKIT = /-webkit-backdrop-filter:/g;

describe('backdrop-filter sobrevive à minificação', () => {
  const minificado = minificar(indexCss);

  it('o index.css declara superfícies de vidro', () => {
    expect(ocorrencias(indexCss, PADRAO)).toBeGreaterThan(0);
  });

  it('mantém a propriedade padrão, que é a única que o Chrome entende', () => {
    expect(ocorrencias(minificado, PADRAO)).toBe(ocorrencias(indexCss, PADRAO));
  });

  it('mantém o alias -webkit-, que o Safari antigo ainda precisa', () => {
    expect(ocorrencias(minificado, WEBKIT)).toBe(ocorrencias(indexCss, PADRAO));
  });

  it('falha se alguém reintroduzir o -webkit- à mão, que é o que causa o descarte', () => {
    expect(ocorrencias(indexCss, WEBKIT)).toBe(0);
  });
});
