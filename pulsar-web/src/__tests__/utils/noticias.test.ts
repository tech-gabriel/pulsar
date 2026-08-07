import { describe, it, expect } from 'vitest';
import { corrigirGraus, resumoLimpo } from '../../utils/noticias';

describe('corrigirGraus', () => {
  it('troca a barra por grau em temperaturas', () => {
    expect(corrigirGraus('marcam 24,7/C em média')).toBe('marcam 24,7°C em média');
  });

  it('não mexe em barras que não são temperatura', () => {
    expect(corrigirGraus('km/h e mm/h')).toBe('km/h e mm/h');
  });
});

describe('resumoLimpo', () => {
  const titulo = 'Manhã de quinta-feira (06) termina com céu claro';

  it('remove o título repetido no começo do resumo', () => {
    const resumo = `${titulo}. Conforme as estações do CGE, os termômetros sobem.`;
    expect(resumoLimpo(titulo, resumo)).toBe('Conforme as estações do CGE, os termômetros sobem.');
  });

  it('ignora diferença de acento e espaço ao comparar', () => {
    const resumo = 'Manha  de quinta-feira (06) termina com ceu claro - segue o texto.';
    expect(resumoLimpo(titulo, resumo)).toBe('segue o texto.');
  });

  it('devolve null quando o resumo é só o título', () => {
    expect(resumoLimpo(titulo, `${titulo}.`)).toBeNull();
  });

  it('mantém o resumo quando ele não repete o título', () => {
    expect(resumoLimpo(titulo, 'Texto independente.')).toBe('Texto independente.');
  });

  it('corrige os graus mesmo sem repetição de título', () => {
    expect(resumoLimpo(titulo, 'Média de 15,7/C na madrugada.')).toBe('Média de 15,7°C na madrugada.');
  });

  it('trata resumo ausente', () => {
    expect(resumoLimpo(titulo, null)).toBeNull();
    expect(resumoLimpo(titulo, '')).toBeNull();
  });
});
