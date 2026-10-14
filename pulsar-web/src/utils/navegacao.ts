/** Navegação com recarga completa (zera o estado em memória da sessão). Isolada para os testes. */
export function irPara(url: string): void {
  window.location.href = url;
}
