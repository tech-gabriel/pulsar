import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { compartilharCard } from '../../../features/compartilhar/compartilhar';

const png = new Blob(['x'], { type: 'image/png' });
const dados = { slug: 'mooca', texto: 'Mooca agora: Alerta de alagamento. https://app-pulsar.com.br/cadastro?regiao=mooca' };
const nav = navigator as unknown as Record<string, unknown>;

let clique: ReturnType<typeof vi.fn<() => void>>;
beforeEach(() => {
  clique = vi.fn<() => void>();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(clique);
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  vi.restoreAllMocks();
  delete nav.canShare; delete nav.share; delete nav.clipboard;
});

describe('compartilharCard', () => {
  it('nativo: compartilha arquivo PNG e texto', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    nav.canShare = vi.fn(() => true); nav.share = share;

    expect(await compartilharCard(png, dados)).toBe('nativo');
    const arg = share.mock.calls[0][0] as { files: File[]; text: string };
    expect(arg.text).toBe(dados.texto);
    expect(arg.files[0].name).toBe('pulsar-mooca.png');
    expect(arg.files[0].type).toBe('image/png');
    expect(clique).not.toHaveBeenCalled();
  });

  it('pessoa cancela a folha de compartilhar: "cancelado", sem baixar', async () => {
    nav.canShare = vi.fn(() => true);
    nav.share = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' }));

    expect(await compartilharCard(png, dados)).toBe('cancelado');
    expect(clique).not.toHaveBeenCalled();
  });

  it('sem compartilhar com arquivo: baixa o PNG e copia o texto', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    nav.canShare = vi.fn(() => false); nav.clipboard = { writeText };

    expect(await compartilharCard(png, dados)).toBe('baixado');
    expect(clique).toHaveBeenCalledOnce();
    expect(writeText).toHaveBeenCalledWith(dados.texto);
  });

  it('sem canShare e com a área de transferência falhando: ainda baixa', async () => {
    nav.clipboard = { writeText: vi.fn().mockRejectedValue(new Error('negado')) };

    expect(await compartilharCard(png, dados)).toBe('baixado-sem-link');
    expect(clique).toHaveBeenCalledOnce();
  });

  it('sistema recusa o compartilhar (gesto expirou, NotAllowedError): baixa e copia em vez de dar erro', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    nav.canShare = vi.fn(() => true);
    nav.share = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'NotAllowedError' }));
    nav.clipboard = { writeText };

    expect(await compartilharCard(png, dados)).toBe('baixado');
    expect(clique).toHaveBeenCalledOnce();
    expect(writeText).toHaveBeenCalledWith(dados.texto);
  });

  it('outro erro do share sobe para quem chamou', async () => {
    nav.canShare = vi.fn(() => true);
    nav.share = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'DataError' }));

    await expect(compartilharCard(png, dados)).rejects.toThrow();
  });
});
