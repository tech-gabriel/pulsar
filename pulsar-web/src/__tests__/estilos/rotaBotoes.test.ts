import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// O jsdom não aplica o index.css: o teste lê a regra. Os botões da rota encolheram (42 e 36 px),
// mas a área de toque precisa seguir com 44 px, numa faixa invisível por cima de cada um.
const raizWeb = process.cwd().endsWith('pulsar-web') ? process.cwd() : resolve(process.cwd(), 'pulsar-web');
const css = readFileSync(resolve(raizWeb, 'src/index.css'), 'utf8');

const regra = (seletor: string) => {
  const i = css.indexOf(`${seletor} {`);
  expect(i, `regra ${seletor}`).toBeGreaterThanOrEqual(0);
  return css.slice(i, css.indexOf('}', i));
};

describe('botões da rota', () => {
  it('primário com 42 px e secundário com 36 px de altura visível', () => {
    expect(regra('.rota-primario')).toMatch(/min-height: 42px/);
    expect(regra('.rota-secundario')).toMatch(/min-height: 36px/);
  });

  it('os dois mantêm 44 px de área de toque', () => {
    expect(regra('.rota-primario, .rota-secundario')).toMatch(/position: relative/);
    const faixa = regra('.rota-primario::after, .rota-secundario::after');
    expect(faixa).toMatch(/position: absolute/);
    expect(faixa).toMatch(/height: 44px/);
  });
});
