import { describe, it, expect } from 'vitest';
import { CloudLightning, CloudRain, CloudDrizzle, Cloud, Sun } from 'lucide-react';
import { iconeCondicao, corCondicao } from '../../components/painel/iconeCondicao';
import { PALETA } from '../../utils/paleta';

describe('iconeCondicao', () => {
  it('mapeia trovoada (2xx) para CloudLightning', () => {
    expect(iconeCondicao(212)).toBe(CloudLightning);
  });

  it('mapeia garoa (3xx) para CloudDrizzle', () => {
    expect(iconeCondicao(300)).toBe(CloudDrizzle);
  });

  it('mapeia chuva (5xx) para CloudRain', () => {
    expect(iconeCondicao(502)).toBe(CloudRain);
  });

  it('mapeia ceu limpo (800) para Sun', () => {
    expect(iconeCondicao(800)).toBe(Sun);
  });

  it('mapeia nuvens (80x acima de 800) para Cloud', () => {
    expect(iconeCondicao(803)).toBe(Cloud);
  });

  it('cai em Cloud para codigo desconhecido', () => {
    expect(iconeCondicao(0)).toBe(Cloud);
    expect(iconeCondicao(999)).toBe(Cloud);
  });

  // As centenas são o contrato da própria API do provedor, então cada borda é
  // conferida dos dois lados: o valor que entra na faixa e o vizinho que fica fora.
  it('fecha a faixa da trovoada exatamente em 200 e 299', () => {
    expect(iconeCondicao(199)).toBe(Cloud);
    expect(iconeCondicao(200)).toBe(CloudLightning);
    expect(iconeCondicao(299)).toBe(CloudLightning);
  });

  it('fecha a faixa da garoa exatamente em 300 e 399', () => {
    expect(iconeCondicao(300)).toBe(CloudDrizzle);
    expect(iconeCondicao(399)).toBe(CloudDrizzle);
    expect(iconeCondicao(400)).toBe(Cloud);
  });

  it('fecha a faixa da chuva exatamente em 500 e 599', () => {
    expect(iconeCondicao(499)).toBe(Cloud);
    expect(iconeCondicao(500)).toBe(CloudRain);
    expect(iconeCondicao(599)).toBe(CloudRain);
  });

  it('trata 800 como ponto e nao como faixa', () => {
    expect(iconeCondicao(799)).toBe(Cloud);
    expect(iconeCondicao(801)).toBe(Cloud);
  });

  it('cai em Cloud para neve (6xx), que nao acontece na area coberta', () => {
    expect(iconeCondicao(600)).toBe(Cloud);
  });
});

describe('corCondicao', () => {
  it('usa tons da paleta e nunca hex proprio', () => {
    const tons: string[] = Object.values(PALETA);
    expect(tons).toContain(corCondicao(502));
    expect(tons).toContain(corCondicao(800));
    expect(tons).toContain(corCondicao(212));
    expect(tons).toContain(corCondicao(300));
    expect(tons).toContain(corCondicao(999));
  });

  it('chuva forte usa tom mais profundo que garoa', () => {
    expect(corCondicao(502)).toBe(PALETA.azulProfundo);
    expect(corCondicao(300)).toBe(PALETA.azul);
  });

  it('separa trovoada, ceu limpo e desconhecido em tons distintos', () => {
    expect(corCondicao(212)).toBe(PALETA.roxo);
    expect(corCondicao(800)).toBe(PALETA.amarelo);
    expect(corCondicao(803)).toBe(PALETA.neutro);
  });
});
