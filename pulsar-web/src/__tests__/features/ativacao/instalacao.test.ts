import { describe, it, expect } from 'vitest';
import { detectarInstalacao, plataformaDe, appIOSInstalado, type SinaisInstalacao } from '../../../features/ativacao/instalacao';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPAD_COMO_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';
const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';

const s = (o: Partial<SinaisInstalacao>): SinaisInstalacao =>
  ({ userAgent: DESKTOP, plataforma: 'Win32', toquesMax: 0, standalone: false, temPrompt: false, ...o });

describe('detectarInstalacao', () => {
  it('modo instalado ganha de tudo', () => expect(detectarInstalacao(s({ userAgent: IPHONE, standalone: true }))).toBe('instalado'));
  it('iPhone no navegador: instruções do Safari', () => expect(detectarInstalacao(s({ userAgent: IPHONE, plataforma: 'iPhone', toquesMax: 5 }))).toBe('ios-safari'));
  it('iPad que se apresenta como Mac também é iOS', () =>
    expect(detectarInstalacao(s({ userAgent: IPAD_COMO_MAC, plataforma: 'MacIntel', toquesMax: 5 }))).toBe('ios-safari'));
  it('Mac de verdade (sem toque) não é iOS', () =>
    expect(detectarInstalacao(s({ userAgent: IPAD_COMO_MAC, plataforma: 'MacIntel', toquesMax: 0 }))).toBe('indisponivel'));
  it('Android/desktop com o prompt guardado: botão nativo', () => expect(detectarInstalacao(s({ userAgent: ANDROID, temPrompt: true }))).toBe('prompt'));
  it('navegador sem prompt (Firefox, Safari macOS): passo some', () => expect(detectarInstalacao(s({}))).toBe('indisponivel'));
});

describe('plataformaDe', () => {
  it('ios', () => expect(plataformaDe(s({ userAgent: IPHONE }))).toBe('ios'));
  it('android', () => expect(plataformaDe(s({ userAgent: ANDROID }))).toBe('android'));
  it('desktop', () => expect(plataformaDe(s({}))).toBe('desktop'));
});

describe('appIOSInstalado (texto de retomada no login)', () => {
  it('só no iPhone/iPad em modo instalado', () => {
    expect(appIOSInstalado(s({ userAgent: IPHONE, standalone: true }))).toBe(true);
    expect(appIOSInstalado(s({ userAgent: IPHONE }))).toBe(false);
  });
  it('Android/computador instalado não fala de iPhone', () => {
    expect(appIOSInstalado(s({ userAgent: ANDROID, standalone: true }))).toBe(false);
    expect(appIOSInstalado(s({ standalone: true }))).toBe(false);
  });
});
