import { describe, it, expect, beforeEach } from 'vitest';
import {
  calcularPassos, precisaDeAtivacao, jaViuAtivacao, marcarAtivacaoVista, limparAtivacaoVista, MARCA_ATIVACAO,
  type ContextoAtivacao,
} from '../../../features/ativacao/passos';

const c = (o: Partial<ContextoAtivacao>): ContextoAtivacao => ({ favoritas: 0, push: 'inativo', instalacao: 'prompt', ...o });

describe('calcularPassos', () => {
  it('novo no Android: os 5 passos', () => {
    expect(calcularPassos(c({}))).toEqual(['promessa', 'escolher', 'instalar', 'alerta', 'pronto']);
  });
  it('novo no iPhone (Safari): sem alerta, que lá não funciona sem instalar', () => {
    expect(calcularPassos(c({ instalacao: 'ios-safari', push: 'indisponivel' }))).toEqual(['promessa', 'escolher', 'instalar', 'pronto']);
  });
  it('app instalado no iPhone, já com favoritas e sem alerta: retoma no alerta', () => {
    expect(calcularPassos(c({ favoritas: 2, instalacao: 'instalado' }))).toEqual(['alerta', 'pronto']);
  });
  it('navegador que não instala e push indisponível: só escolher', () => {
    expect(calcularPassos(c({ instalacao: 'indisponivel', push: 'indisponivel' }))).toEqual(['promessa', 'escolher', 'pronto']);
  });
  it('alerta negado não volta a ser pedido', () => {
    expect(calcularPassos(c({ favoritas: 1, instalacao: 'instalado', push: 'negado' }))).toEqual([]);
  });
  it('já tem tudo: nenhum passo', () => {
    expect(calcularPassos(c({ favoritas: 3, instalacao: 'instalado', push: 'ativo' }))).toEqual([]);
  });
});

describe('precisaDeAtivacao', () => {
  it('0 favoritas precisa', () => expect(precisaDeAtivacao(c({ favoritas: 0, push: 'ativo' }))).toBe(true));
  it('app instalado sem alerta precisa', () => expect(precisaDeAtivacao(c({ favoritas: 2, instalacao: 'instalado', push: 'inativo' }))).toBe(true));
  it('com favoritas no navegador, mesmo sem alerta, não precisa (o convite do mapa cuida)', () =>
    expect(precisaDeAtivacao(c({ favoritas: 2, instalacao: 'prompt', push: 'inativo' }))).toBe(false));
  it('push negado não precisa (senão seria loop)', () =>
    expect(precisaDeAtivacao(c({ favoritas: 2, instalacao: 'instalado', push: 'negado' }))).toBe(false));
});

describe('marca local', () => {
  beforeEach(() => localStorage.clear());
  it('marca, lê e limpa', () => {
    expect(jaViuAtivacao()).toBe(false);
    marcarAtivacaoVista();
    expect(localStorage.getItem(MARCA_ATIVACAO)).toBe('1');
    expect(jaViuAtivacao()).toBe(true);
    limparAtivacaoVista();
    expect(jaViuAtivacao()).toBe(false);
  });
});
