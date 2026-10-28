/**
 * Cor da barra do sistema (status bar do Android e do Safari, via <meta name="theme-color">).
 * Segue o que aparece no topo da tela: o fundo do app no tema atual, ou a cor que uma tela
 * pedir enquanto estiver aberta (o login no celular começa com o painel azul).
 * O public/theme-init.js aplica a cor do tema antes do primeiro paint, com os mesmos valores.
 */
export const COR_DO_TEMA = { light: '#EFF6FB', dark: '#052F4A' } as const;

let temaAtual: keyof typeof COR_DO_TEMA = 'light';
let corDaTela: string | null = null;

function aplicar() {
  if (typeof document === 'undefined') return;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', corDaTela ?? COR_DO_TEMA[temaAtual]);
  // A faixa atrás da barra no iPhone com o app instalado (body::before) usa a mesma cor.
  if (corDaTela) document.documentElement.style.setProperty('--cor-barra', corDaTela);
  else document.documentElement.style.removeProperty('--cor-barra');
}

/** Chamado pelo ThemeProvider quando o tema muda. */
export function definirTemaDaBarra(tema: keyof typeof COR_DO_TEMA) {
  temaAtual = tema;
  aplicar();
}

/** Uma tela pede a sua cor; `null` devolve a do tema. */
export function definirCorDaTela(cor: string | null) {
  corDaTela = cor;
  aplicar();
}
