/**
 * Mostra algo só quando o ponteiro para: cada movimento esconde o que está à mostra e reinicia a
 * espera; depois de `atrasoMs` parado, mostra com o último valor. É o tooltip do mapa que não
 * persegue o mouse enquanto a pessoa navega.
 */
export function criarRepouso<T>(atrasoMs: number, mostrar: (valor: T) => void, esconder: () => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const parar = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  return {
    mover(valor: T) {
      parar();
      esconder();
      timer = setTimeout(() => {
        timer = undefined;
        mostrar(valor);
      }, atrasoMs);
    },
    cancelar() {
      parar();
      esconder();
    },
  };
}
