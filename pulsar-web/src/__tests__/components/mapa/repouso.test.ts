import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { criarRepouso } from '../../../components/mapa/repouso';

describe('criarRepouso', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('só mostra depois de o ponteiro ficar parado pelo tempo pedido, com o último valor', () => {
    const mostrar = vi.fn();
    const esconder = vi.fn();
    const r = criarRepouso<string>(400, mostrar, esconder);
    r.mover('a');
    vi.advanceTimersByTime(300);
    r.mover('b');
    vi.advanceTimersByTime(300);
    expect(mostrar).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(mostrar).toHaveBeenCalledTimes(1);
    expect(mostrar).toHaveBeenCalledWith('b');
  });

  it('cada movimento esconde o que estava à mostra', () => {
    const esconder = vi.fn();
    const r = criarRepouso<string>(400, vi.fn(), esconder);
    r.mover('a');
    r.mover('b');
    expect(esconder).toHaveBeenCalledTimes(2);
  });

  it('cancelar esconde e impede que apareça depois', () => {
    const mostrar = vi.fn();
    const esconder = vi.fn();
    const r = criarRepouso<string>(400, mostrar, esconder);
    r.mover('a');
    r.cancelar();
    vi.advanceTimersByTime(1000);
    expect(mostrar).not.toHaveBeenCalled();
    expect(esconder).toHaveBeenCalledTimes(2);
  });
});
