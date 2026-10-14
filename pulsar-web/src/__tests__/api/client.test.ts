import { describe, it, expect, vi, beforeEach } from 'vitest';

const nav = vi.hoisted(() => ({ irPara: vi.fn() }));
vi.mock('../../utils/navegacao', () => nav);

import { tratarErroResposta, URL_SESSAO_ENCERRADA } from '../../api/client';

describe('interceptador de 401', () => {
  beforeEach(() => {
    nav.irPara.mockReset();
    localStorage.setItem('pulsar_token', 't');
    localStorage.setItem('pulsar_usuario', '{}');
  });

  it('401 numa requisição com token: limpa a sessão e leva ao login com o aviso', async () => {
    const err = { response: { status: 401 }, config: { headers: { Authorization: 'Bearer t' } } };
    await expect(tratarErroResposta(err)).rejects.toBe(err);
    expect(localStorage.getItem('pulsar_token')).toBeNull();
    expect(nav.irPara).toHaveBeenCalledWith(URL_SESSAO_ENCERRADA);
  });

  it('401 sem token (senha errada no login): não redireciona nem apaga nada', async () => {
    const err = { response: { status: 401 }, config: { headers: {} } };
    await expect(tratarErroResposta(err)).rejects.toBe(err);
    expect(nav.irPara).not.toHaveBeenCalled();
    expect(localStorage.getItem('pulsar_token')).toBe('t');
  });

  it('outros erros passam direto', async () => {
    const err = { response: { status: 500 }, config: { headers: { Authorization: 'Bearer t' } } };
    await expect(tratarErroResposta(err)).rejects.toBe(err);
    expect(nav.irPara).not.toHaveBeenCalled();
  });
});
