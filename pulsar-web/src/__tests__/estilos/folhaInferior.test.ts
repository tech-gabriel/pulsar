import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// O jsdom não aplica o index.css: o teste lê as regras. A folha usa o vidro denso (.vidro-painel),
// que fica sólido com "Efeito de vidro" desligado e com "Reduzir transparência" do sistema.
const raizWeb = process.cwd().endsWith('pulsar-web') ? process.cwd() : resolve(process.cwd(), 'pulsar-web');
const css = readFileSync(resolve(raizWeb, 'src/index.css'), 'utf8');

describe('folha inferior em vidro', () => {
  it('cai para a superfície sólida sem transparência', () => {
    expect(css).toMatch(/html\.sem-transparencia \.vidro-painel \{ background: var\(--superficie\) !important; backdrop-filter: none; \}/);
    expect(css).toMatch(/prefers-reduced-transparency: reduce\) \{ \.vidro-painel \{ background: var\(--superficie\) !important; backdrop-filter: none; \} \}/);
  });

  it('flutua a 8 px das bordas, somando a área segura de baixo, com raio de 28 px', () => {
    const i = css.indexOf('.folha-inferior {');
    expect(i).toBeGreaterThanOrEqual(0);
    const regra = css.slice(i, css.indexOf('}', i));
    expect(regra).toMatch(/left: 8px; right: 8px; bottom: calc\(var\(--seguro-baixo\) \+ 8px\)/);
    expect(regra).toMatch(/border-radius: 28px/);
  });
});
