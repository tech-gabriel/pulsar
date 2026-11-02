/** Sem WebGL o MapLibre não desenha nada; o MapaBase mostra um aviso no lugar. */
export function temWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
