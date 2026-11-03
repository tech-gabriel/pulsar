import { renderHook, waitFor, act } from '@testing-library/react';
import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FeatureCollection } from 'geojson';
import type { RotaAvaliacao } from '../../features/rota/tipos';
import type { SubprefeituraMapaDto } from '../../types';

vi.mock('../../api/rota', () => ({ avaliarRota: vi.fn(), pedirAvisoRota: vi.fn(), cancelarAvisoRota: vi.fn() }));
const push = vi.hoisted(() => ({ estado: 'ativo', ocupado: false, ativar: vi.fn(), desativar: vi.fn() }));
const prefs = vi.hoisted(() => ({ alertaModerado: false, alertaAlto: true, resumoDiario: false }));
vi.mock('../../hooks/useNotificacoesPrefs', () => ({ useNotificacoesPrefs: () => ({ prefs }) }));
const usePush = vi.hoisted(() => vi.fn());
vi.mock('../../hooks/usePushSubscription', () => ({ usePushSubscription: usePush }));
const showToast = vi.hoisted(() => vi.fn());
const trackMock = vi.hoisted(() => ({ viuVereditoRota: vi.fn(), pediuAvisoRota: vi.fn() }));
vi.mock('../../analytics', () => ({ track: trackMock }));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast }) }));

import { avaliarRota, cancelarAvisoRota, pedirAvisoRota } from '../../api/rota';
import { REAVALIAR_MS, useRota } from '../../hooks/useRota';

const avaliar = avaliarRota as ReturnType<typeof vi.fn>;
const avisar = pedirAvisoRota as ReturnType<typeof vi.fn>;
const cancelar = cancelarAvisoRota as ReturnType<typeof vi.fn>;

const leve = JSON.parse(
  readFileSync(join(__dirname, '../../../public/subprefeituras-leve.geojson'), 'utf8'),
) as FeatureCollection;
const subs = [{ id: 'se', nome: 'Sé' }, { id: 'mooca', nome: 'Mooca' }] as SubprefeituraMapaDto[];

const se = { lat: -23.5505, lon: -46.6333, rotulo: 'Sé' };
const mooca = { lat: -23.545, lon: -46.6, rotulo: 'Mooca' };
const rio = { lat: -22.9, lon: -43.2, rotulo: 'Rio' };

const avaliacao = (estado: RotaAvaliacao['estado'] = 'PodeIr'): RotaAvaliacao => ({
  estado, trechoDecisivoId: null, tranquiloAteUtc: null, esperarAteUtc: null, horas: [],
  trechos: [
    { subprefeituraId: 'se', nome: 'Sé', faixa: 'BAIXO', alagandoCge: false },
    { subprefeituraId: 'mooca', nome: 'Mooca', faixa: 'ALTO', alagandoCge: false },
  ],
});

beforeEach(() => {
  vi.clearAllMocks();
  push.estado = 'ativo';
  prefs.alertaAlto = true;
  usePush.mockReturnValue(push);
  avaliar.mockResolvedValue(avaliacao());
});

describe('useRota', () => {
  it('com origem e destino avalia com os ids na ordem do corredor', async () => {
    const { result } = renderHook(() => useRota(leve, subs));
    act(() => { result.current.setOrigem(se); result.current.setDestino(mooca); });
    await waitFor(() => expect(result.current.resultado?.estado).toBe('PodeIr'));
    expect(avaliar).toHaveBeenCalledWith(['se', 'mooca']);
    expect(result.current.linha?.features.some((f) => f.properties?.cor)).toBe(true);
  });

  it('sem os dois pontos não chama a API', () => {
    const { result } = renderHook(() => useRota(leve, subs));
    act(() => result.current.setDestino(mooca));
    expect(avaliar).not.toHaveBeenCalled();
  });

  it('destino fora de SP vira erro sem chamar a API', () => {
    const { result } = renderHook(() => useRota(leve, subs));
    act(() => { result.current.setOrigem(se); result.current.setDestino(rio); });
    expect(result.current.erro).toBe('destinoFora');
    expect(avaliar).not.toHaveBeenCalled();
  });

  it('duas trocas rápidas de destino mantêm só o último resultado', async () => {
    let soltarPrimeira!: (r: RotaAvaliacao) => void;
    avaliar.mockImplementationOnce(() => new Promise((res) => { soltarPrimeira = res; }));
    avaliar.mockResolvedValueOnce(avaliacao('Esperar'));
    const { result } = renderHook(() => useRota(leve, subs));
    act(() => { result.current.setOrigem(se); result.current.setDestino(mooca); });
    act(() => result.current.setDestino(rio));
    act(() => result.current.setDestino({ lat: -23.5455, lon: -46.61, rotulo: 'Perto da Mooca' }));
    await waitFor(() => expect(result.current.resultado?.estado).toBe('Esperar'));
    await act(async () => soltarPrimeira(avaliacao('PodeIr')));
    expect(result.current.resultado?.estado).toBe('Esperar');
  });

  it('falha da API vira erro de rede', async () => {
    avaliar.mockRejectedValueOnce(new Error('x'));
    const { result } = renderHook(() => useRota(leve, subs));
    act(() => { result.current.setOrigem(se); result.current.setDestino(mooca); });
    await waitFor(() => expect(result.current.erro).toBe('rede'));
  });

  it('pedir aviso com push ativo registra o pedido', async () => {
    const { result } = renderHook(() => useRota(leve, subs));
    act(() => { result.current.setOrigem(se); result.current.setDestino(mooca); });
    await waitFor(() => expect(result.current.resultado).not.toBeNull());
    await act(() => result.current.pedirAviso());
    expect(avisar).toHaveBeenCalledWith(['se', 'mooca'], 'Mooca');
    expect(result.current.avisoPedido).toBe(true);
  });

  it('pedir aviso com push desligado liga primeiro; se o navegador negar, avisa e não registra', async () => {
    push.estado = 'inativo';
    push.ativar.mockResolvedValue('negado');
    const { result } = renderHook(() => useRota(leve, subs));
    act(() => { result.current.setOrigem(se); result.current.setDestino(mooca); });
    await waitFor(() => expect(result.current.resultado).not.toBeNull());
    await act(() => result.current.pedirAviso());
    expect(push.ativar).toHaveBeenCalled();
    expect(avisar).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Permita as notificações do Pulsar no navegador para receber o aviso.', expect.anything());
  });
});

describe('useRota: nova tentativa e avisos', () => {
  const abre = async () => {
    const h = renderHook(() => useRota(leve, subs));
    act(() => { h.result.current.setOrigem(se); h.result.current.setDestino(mooca); });
    await waitFor(() => expect(h.result.current.resultado).not.toBeNull());
    return h;
  };

  it('tentarDeNovo refaz a avaliação depois de um erro de rede', async () => {
    avaliar.mockRejectedValueOnce(new Error('x'));
    const { result } = renderHook(() => useRota(leve, subs));
    act(() => { result.current.setOrigem(se); result.current.setDestino(mooca); });
    await waitFor(() => expect(result.current.erro).toBe('rede'));
    act(() => result.current.tentarDeNovo());
    await waitFor(() => expect(result.current.resultado?.estado).toBe('PodeIr'));
    expect(avaliar).toHaveBeenCalledTimes(2);
    expect(result.current.erro).toBeNull();
  });

  it.each([
    ['indisponivel', 'Este aparelho não recebe avisos. No iPhone, instale o Pulsar na tela de início.'],
    ['negado', 'Permita as notificações do Pulsar no navegador para receber o aviso.'],
  ])('push %s tem o seu texto e não tenta ativar', async (estado, texto) => {
    push.estado = estado;
    const { result } = await abre();
    await act(() => result.current.pedirAviso());
    expect(showToast).toHaveBeenCalledWith(texto, expect.anything());
    expect(push.ativar).not.toHaveBeenCalled();
    expect(avisar).not.toHaveBeenCalled();
  });

  it('recusar no pedido (continua inativo) usa o texto de ligar os avisos', async () => {
    push.estado = 'inativo';
    push.ativar.mockResolvedValue('inativo');
    const { result } = await abre();
    await act(() => result.current.pedirAviso());
    expect(showToast).toHaveBeenCalledWith('Ligue os avisos para saber quando o caminho melhorar.', expect.anything());
  });

  it('push carregando marca o aviso como indisponível', async () => {
    push.estado = 'carregando';
    const { result } = await abre();
    expect(result.current.avisoIndisponivel).toBe(true);
  });

  it('destino "Minha localização" vai ao pedido com o nome da última subprefeitura', async () => {
    const { result } = renderHook(() => useRota(leve, subs));
    act(() => { result.current.setOrigem(se); result.current.setDestino({ ...mooca, rotulo: 'Minha localização' }); });
    await waitFor(() => expect(result.current.resultado).not.toBeNull());
    await act(() => result.current.pedirAviso());
    expect(avisar).toHaveBeenCalledWith(['se', 'mooca'], 'Mooca');
  });
});

describe('useRota: preferências, cancelamento e push só com a rota aberta', () => {
  const abre = async () => {
    const h = renderHook(() => useRota(leve, subs));
    act(() => { h.result.current.setOrigem(se); h.result.current.setDestino(mooca); });
    await waitFor(() => expect(h.result.current.resultado).not.toBeNull());
    return h;
  };

  it('push ativo com todos os tipos de aviso desligados não registra e explica', async () => {
    prefs.alertaAlto = false;
    const { result } = await abre();
    await act(() => result.current.pedirAviso());
    expect(avisar).not.toHaveBeenCalled();
    expect(result.current.avisoPedido).toBe(false);
    expect(showToast).toHaveBeenCalledWith('Ligue algum tipo de aviso em Configurações para receber quando o caminho melhorar.', expect.anything());
  });

  it('cancelar aviso chama a API e volta ao estado sem aviso', async () => {
    const { result } = await abre();
    await act(() => result.current.pedirAviso());
    expect(result.current.avisoPedido).toBe(true);
    await act(() => result.current.cancelarAviso());
    expect(cancelar).toHaveBeenCalled();
    expect(result.current.avisoPedido).toBe(false);
  });

  it('cancelar que falha mantém o aviso e avisa', async () => {
    cancelar.mockRejectedValueOnce(new Error('x'));
    const { result } = await abre();
    await act(() => result.current.pedirAviso());
    await act(() => result.current.cancelarAviso());
    expect(result.current.avisoPedido).toBe(true);
    expect(showToast).toHaveBeenCalledWith('Não consegui cancelar o aviso agora. Tente de novo.', 'error');
  });

  it('a consulta do push só liga com a rota aberta', () => {
    const { rerender } = renderHook(({ aberta }) => useRota(leve, subs, aberta), { initialProps: { aberta: false } });
    expect(usePush).toHaveBeenLastCalledWith(expect.anything(), false);
    rerender({ aberta: true });
    expect(usePush).toHaveBeenLastCalledWith(expect.anything(), true);
  });
});

describe('useRota: reavaliação a cada 5 min', () => {
  let oculta = false;
  beforeEach(() => {
    oculta = false;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => oculta });
    ciclos = [];
    // Só o intervalo de 5 min é capturado (o waitFor também usa setInterval e segue real).
    const real = window.setInterval.bind(window);
    vi.spyOn(window, 'setInterval').mockImplementation(((fn: () => void, ms?: number) => {
      if (ms !== REAVALIAR_MS) return real(fn, ms);
      ciclos.push(fn);
      return 0;
    }) as typeof window.setInterval);
  });
  afterEach(() => vi.restoreAllMocks());
  let ciclos: (() => void)[] = [];
  const passa = (n = 1) => act(() => { for (let i = 0; i < n; i++) ciclos.at(-1)?.(); });

  const abre = async () => {
    const h = renderHook(() => useRota(leve, subs));
    act(() => { h.result.current.setOrigem(se); h.result.current.setDestino(mooca); });
    await waitFor(() => expect(h.result.current.resultado).not.toBeNull());
    return h;
  };

  it('reavalia sozinha e troca o resultado sem passar pelo carregando', async () => {
    const { result } = await abre();
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + REAVALIAR_MS);
    avaliar.mockResolvedValueOnce(avaliacao('Esperar'));
    passa();
    expect(result.current.carregando).toBe(false);
    expect(result.current.resultado).not.toBeNull();
    await waitFor(() => expect(result.current.resultado?.estado).toBe('Esperar'));
    expect(avaliar).toHaveBeenCalledTimes(2);
    expect(result.current.atualizadoEm).toBe(Date.now());
  });

  it('com a aba oculta espera ela voltar para reavaliar', async () => {
    await abre();
    oculta = true;
    passa(2);
    expect(avaliar).toHaveBeenCalledTimes(1);
    oculta = false;
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    await waitFor(() => expect(avaliar).toHaveBeenCalledTimes(2));
  });

  it('falha na reavaliação mantém o resultado que estava na tela', async () => {
    const { result } = await abre();
    avaliar.mockRejectedValueOnce(new Error('x'));
    passa();
    await waitFor(() => expect(avaliar).toHaveBeenCalledTimes(2));
    await act(async () => {});
    expect(result.current.erro).toBeNull();
    expect(result.current.resultado?.estado).toBe('PodeIr');
  });
});

describe('useRota: evento do veredito', () => {
  it('reavaliação com o mesmo estado não conta de novo; estado novo conta', async () => {
    const ciclos: (() => void)[] = [];
    const real = window.setInterval.bind(window);
    vi.spyOn(window, 'setInterval').mockImplementation(((fn: () => void, ms?: number) => {
      if (ms !== REAVALIAR_MS) return real(fn, ms);
      ciclos.push(fn);
      return 0;
    }) as typeof window.setInterval);
    const { result } = renderHook(() => useRota(leve, subs));
    act(() => { result.current.setOrigem(se); result.current.setDestino(mooca); });
    await waitFor(() => expect(result.current.resultado).not.toBeNull());
    expect(trackMock.viuVereditoRota).toHaveBeenCalledTimes(1);

    act(() => ciclos.at(-1)?.());
    await waitFor(() => expect(avaliar).toHaveBeenCalledTimes(2));
    await act(async () => {});
    expect(trackMock.viuVereditoRota).toHaveBeenCalledTimes(1);

    avaliar.mockResolvedValueOnce(avaliacao('Esperar'));
    act(() => ciclos.at(-1)?.());
    await waitFor(() => expect(result.current.resultado?.estado).toBe('Esperar'));
    expect(trackMock.viuVereditoRota).toHaveBeenCalledTimes(2);
    expect(trackMock.viuVereditoRota).toHaveBeenLastCalledWith('Esperar');
    vi.restoreAllMocks();
  });
});
