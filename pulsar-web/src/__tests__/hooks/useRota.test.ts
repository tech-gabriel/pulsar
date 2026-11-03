import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FeatureCollection } from 'geojson';
import type { RotaAvaliacao } from '../../features/rota/tipos';
import type { SubprefeituraMapaDto } from '../../types';

vi.mock('../../api/rota', () => ({ avaliarRota: vi.fn(), pedirAvisoRota: vi.fn(), cancelarAvisoRota: vi.fn() }));
const push = vi.hoisted(() => ({ estado: 'ativo', ocupado: false, ativar: vi.fn(), desativar: vi.fn() }));
vi.mock('../../hooks/useNotificacoesPrefs', () => ({ useNotificacoesPrefs: () => ({ prefs: {} }) }));
vi.mock('../../hooks/usePushSubscription', () => ({ usePushSubscription: () => push }));
const showToast = vi.hoisted(() => vi.fn());
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast }) }));

import { avaliarRota, pedirAvisoRota } from '../../api/rota';
import { useRota } from '../../hooks/useRota';

const avaliar = avaliarRota as ReturnType<typeof vi.fn>;
const avisar = pedirAvisoRota as ReturnType<typeof vi.fn>;

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
