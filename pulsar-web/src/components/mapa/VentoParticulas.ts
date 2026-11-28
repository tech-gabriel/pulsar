import type { CustomLayerInterface, Map as MapaLibre } from 'maplibre-gl';
import { desvio, pxPorQuadro, type PontoVento } from '../../features/mapa/ventoCampo';

export const ID_VENTO = 'pulsar-vento';
export type ModoVento = 'animar' | 'parado' | 'nada';

// Valores aprovados no protótipo (comum.js, ventoAnimado).
const QUANTIDADE = 240;
const FADE = 0.84; // o rastro some a 0,84 por quadro
const PONTOS = 10; // posições guardadas por partícula (o rastro)
const QUADRO_MS = 1000 / 60 - 2; // passo travado em 60 por segundo, mesmo em tela de 120 Hz
const SUAVE = 1; // px a mais no quad, que o shader esfuma na borda (antisserrilhado)
const BRANCO = [1, 1, 1, 1];
const SOMBRA = [15 / 255, 23 / 255, 42 / 255, 0.75]; // slate-900 a .75, a sombra do claro no spec
const SOMBRA_EXTRA = 1.6 / 2; // a sombra fica 1,6 px mais larga que o traço
// Mesma grade do protótipo para achar o trecho de uma posição.
const chave = (lon: number, lat: number) => Math.round(lon / 0.012) + ':' + Math.round(lat / 0.011);

const VS = `
attribute vec2 a_pos;
attribute vec4 a_dados; // normal (xy), meia largura com o sinal do lado (z), alfa (w)
uniform vec2 u_tela;
uniform float u_extra;
varying float v_alfa;
varying float v_lado;
void main() {
  float lado = sign(a_dados.z);
  vec2 p = a_pos + a_dados.xy * (a_dados.z + lado * u_extra);
  gl_Position = vec4(p.x / u_tela.x * 2.0 - 1.0, 1.0 - p.y / u_tela.y * 2.0, 0.0, 1.0);
  v_alfa = a_dados.w;
  v_lado = lado;
}`;
const FS = `
precision mediump float;
uniform vec4 u_cor;
varying float v_alfa;
varying float v_lado;
void main() {
  float a = u_cor.a * v_alfa * (1.0 - smoothstep(0.35, 1.0, abs(v_lado)));
  gl_FragColor = vec4(u_cor.rgb * a, a);
}`;

interface Particula { rastro: [number, number][]; vida: number; idade: number; kmh: number }

/**
 * Tracinhos do vento como custom layer do MapLibre: o passo e a projeção rodam na CPU (240
 * partículas, 10 pontos cada) e a placa de vídeo desenha cada trecho do rastro como um quad.
 * `modo()` é lido a cada quadro; quem muda o modo chama `map.triggerRepaint()`.
 */
export function camadaVento(campo: PontoVento[], claro: boolean, modo: () => ModoVento): CustomLayerInterface {
  const porCelula = new Map(campo.map((p) => [chave(p.lon, p.lat), p]));
  const parts: Particula[] = Array.from({ length: QUANTIDADE }, () => ({ rastro: [], vida: 0, idade: 0, kmh: 0 }));
  const verts = new Float32Array(QUANTIDADE * (PONTOS - 1) * 6 * 6);
  let mapa: MapaLibre | null = null;
  let programa: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  let vao: WebGLVertexArrayObject | null = null;
  let visiveis = campo;
  let movendo = false;
  let modoAnterior: ModoVento = 'nada';
  let ultimo = 0;

  const atualizarVisiveis = () => {
    if (!mapa) return;
    const { clientWidth: w, clientHeight: h } = mapa.getCanvas();
    const v = campo.filter((p) => {
      const q = mapa!.project([p.lon, p.lat]);
      return q.x > -10 && q.y > -10 && q.x < w + 10 && q.y < h + 10;
    });
    visiveis = v.length ? v : campo;
  };

  // Nasce num trecho visível, com parte da vida já andada para não piscarem todas juntas.
  const nascer = (p: Particula, idade: number) => {
    const t = visiveis[(Math.random() * visiveis.length) | 0];
    p.rastro = [[t.lon + (Math.random() - 0.5) * 0.012, t.lat + (Math.random() - 0.5) * 0.011]];
    p.vida = 30 + Math.random() * 40;
    p.idade = idade < 0 ? Math.random() * p.vida : idade;
    p.kmh = t.kmh;
  };

  // Um passo na tela, na direção do vento do trecho com a curva do lugar; false = saiu do campo.
  const andar = (p: Particula, escala: number): boolean => {
    const [lon, lat] = p.rastro[0];
    const t = porCelula.get(chave(lon, lat));
    if (!t || !mapa) return false;
    const a = mapa.project([lon, lat]);
    const px = pxPorQuadro(t.kmh) * escala;
    const ang = t.paraRad + desvio(lon, lat);
    const b = mapa.unproject([a.x + Math.sin(ang) * px, a.y - Math.cos(ang) * px]);
    p.rastro.unshift([b.lng, b.lat]);
    if (p.rastro.length > PONTOS) p.rastro.length = PONTOS;
    p.kmh = t.kmh;
    return true;
  };

  const passo = () => {
    for (const p of parts) {
      p.idade++;
      if (p.idade > p.vida || !andar(p, 1)) nascer(p, 0);
    }
  };

  // Reduzir movimento: um traço curto e parado por partícula (6 passos dobrados, como no protótipo).
  const montarParado = () => {
    for (const p of parts) {
      nascer(p, 0);
      for (let i = 0; i < 6 && andar(p, 2); i++);
    }
  };

  const renascer = () => {
    atualizarVisiveis();
    if (modo() === 'parado') montarParado();
    else for (const p of parts) nascer(p, -1);
    mapa?.triggerRepaint();
  };
  const limpar = () => {
    movendo = true;
    for (const p of parts) p.rastro = [];
  };
  const soltar = () => {
    movendo = false;
    renascer();
  };

  // Expande cada trecho do rastro num quad; o alfa cai a FADE por ponto, a partir da cabeça.
  const montarVertices = (parado: boolean): number => {
    let n = 0;
    for (const p of parts) {
      if (p.rastro.length < 2) continue;
      const rel = p.idade / p.vida;
      const forca = p.kmh > 40 ? 1 : p.kmh > 20 ? 0.9 : 0.75;
      const cabeca = parado ? 0.5 : Math.min(1, rel * 4, (1 - rel) * 4) * forca;
      const meia = ((parado ? 1.2 : p.kmh > 40 ? 1.6 : 1.3) + SUAVE) / 2;
      const k = parado ? 1 : FADE;
      let a0 = cabeca;
      let q0 = mapa!.project(p.rastro[0]);
      for (let i = 1; i < p.rastro.length; i++) {
        const q1 = mapa!.project(p.rastro[i]);
        const a1 = a0 * k;
        const dx = q1.x - q0.x, dy = q1.y - q0.y;
        const len = Math.hypot(dx, dy);
        if (len > 1e-3) {
          const nx = -dy / len, ny = dx / len;
          for (const [q, s, a] of [[q0, 1, a0], [q0, -1, a0], [q1, 1, a1], [q0, -1, a0], [q1, -1, a1], [q1, 1, a1]] as const) {
            verts.set([q.x, q.y, nx, ny, s * meia, a], n * 6);
            n++;
          }
        }
        q0 = q1;
        a0 = a1;
      }
    }
    return n;
  };

  const compilar = (g: WebGL2RenderingContext, tipo: number, fonte: string) => {
    const s = g.createShader(tipo)!;
    g.shaderSource(s, fonte);
    g.compileShader(s);
    return s;
  };

  return {
    id: ID_VENTO,
    type: 'custom',
    renderingMode: '2d',
    onAdd(m, g) {
      mapa = m;
      programa = g.createProgram()!;
      g.attachShader(programa, compilar(g, g.VERTEX_SHADER, VS));
      g.attachShader(programa, compilar(g, g.FRAGMENT_SHADER, FS));
      g.linkProgram(programa);
      buffer = g.createBuffer();
      vao = g.createVertexArray();
      g.bindVertexArray(vao);
      g.bindBuffer(g.ARRAY_BUFFER, buffer);
      const pos = g.getAttribLocation(programa, 'a_pos');
      const dados = g.getAttribLocation(programa, 'a_dados');
      g.enableVertexAttribArray(pos);
      g.vertexAttribPointer(pos, 2, g.FLOAT, false, 24, 0);
      g.enableVertexAttribArray(dados);
      g.vertexAttribPointer(dados, 4, g.FLOAT, false, 24, 8);
      g.bindVertexArray(null);
      m.on('movestart', limpar);
      m.on('moveend', soltar);
    },
    onRemove(m, g) {
      m.off('movestart', limpar);
      m.off('moveend', soltar);
      g.deleteBuffer(buffer);
      g.deleteVertexArray(vao);
      g.deleteProgram(programa);
      mapa = null;
    },
    render(g) {
      const m = modo();
      const entrou = m !== modoAnterior;
      modoAnterior = m;
      if (m === 'nada' || movendo || !mapa || !programa) return;
      if (entrou) renascer();
      if (m === 'animar') {
        const agora = performance.now();
        if (agora - ultimo >= QUADRO_MS) {
          ultimo = agora;
          passo();
        }
        mapa.triggerRepaint();
      }
      const n = montarVertices(m === 'parado');
      if (!n) return;
      const canvas = mapa.getCanvas();
      g.useProgram(programa);
      g.bindVertexArray(vao);
      g.bindBuffer(g.ARRAY_BUFFER, buffer);
      g.bufferData(g.ARRAY_BUFFER, verts.subarray(0, n * 6), g.DYNAMIC_DRAW);
      // Coordenadas em px CSS: a placa escala pelo devicePixelRatio, como o g.scale(dpr) do canvas.
      g.uniform2f(g.getUniformLocation(programa, 'u_tela'), canvas.clientWidth, canvas.clientHeight);
      const cor = g.getUniformLocation(programa, 'u_cor');
      const extra = g.getUniformLocation(programa, 'u_extra');
      // No claro, o branco precisa de uma sombra escura e larga por baixo para não sumir no fundo.
      if (claro) {
        g.uniform4fv(cor, SOMBRA);
        g.uniform1f(extra, SOMBRA_EXTRA);
        g.drawArrays(g.TRIANGLES, 0, n);
      }
      g.uniform4fv(cor, BRANCO);
      g.uniform1f(extra, 0);
      g.drawArrays(g.TRIANGLES, 0, n);
      g.bindVertexArray(null);
    },
  };
}
