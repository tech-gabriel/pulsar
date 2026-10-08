import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Area } from '../../../features/cidade/areas';

const showToast = vi.fn();
const m = vi.hoisted(() => ({
  carregar: vi.fn(), gerar: vi.fn(), compartilhar: vi.fn(), desenhar: vi.fn(),
}));
vi.mock('../../../contexts/ToastContext', () => ({ useToast: () => ({ showToast }) }));
vi.mock('../../../hooks/useCatalogoDicas', () => ({ useCatalogoDicas: () => [] }));
vi.mock('../../../features/compartilhar/compartilhar', () => ({
  carregarFontesCard: m.carregar, gerarPng: m.gerar, compartilharCard: m.compartilhar,
}));
vi.mock('../../../features/compartilhar/desenharCard', () => ({ desenharCard: m.desenhar }));

import BotaoCompartilhar from '../../../features/compartilhar/BotaoCompartilhar';

const area = {
  id: 's1', nome: 'Mooca', zona: 'Leste', latitude: 0, longitude: 0, faixaRisco: 'ALTO',
  scoreAtual: { valor: 78, faixa: 'ALTO', timestamp: new Date().toISOString(), perigoPrincipal: 'ALAGAMENTO', chuva3hMm: 22 },
  ultimaLeitura: null,
} as unknown as Area;

beforeEach(() => {
  vi.clearAllMocks();
  m.carregar.mockResolvedValue(undefined);
  m.gerar.mockResolvedValue(new Blob(['x']));
  m.compartilhar.mockResolvedValue('nativo');
});

describe('BotaoCompartilhar', () => {
  it('gera o card com os dados da subprefeitura e compartilha', async () => {
    render(<BotaoCompartilhar area={area} />);
    fireEvent.click(screen.getByRole('button', { name: /compartilhar/i }));
    await waitFor(() => expect(m.compartilhar).toHaveBeenCalledOnce());
    expect(m.desenhar.mock.calls[0][1]).toMatchObject({ nome: 'Mooca', rotuloFaixa: 'ALERTA' });
    expect(showToast).not.toHaveBeenCalled();
  });

  it('dois toques seguidos geram um card só', async () => {
    let soltar!: () => void;
    m.carregar.mockReturnValue(new Promise<void>((r) => { soltar = r; }));
    render(<BotaoCompartilhar area={area} />);
    const botao = screen.getByRole('button', { name: /compartilhar/i });
    fireEvent.click(botao);
    fireEvent.click(botao);
    soltar();
    await waitFor(() => expect(m.compartilhar).toHaveBeenCalledOnce());
    expect(m.gerar).toHaveBeenCalledOnce();
  });

  it('baixado: avisa que a imagem foi salva e o link copiado', async () => {
    m.compartilhar.mockResolvedValue('baixado');
    render(<BotaoCompartilhar area={area} />);
    fireEvent.click(screen.getByRole('button', { name: /compartilhar/i }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Imagem salva e link copiado', 'success'));
  });

  it('falha ao gerar: toast de erro, sem quebrar', async () => {
    m.carregar.mockRejectedValue(new Error('fonte'));
    render(<BotaoCompartilhar area={area} />);
    fireEvent.click(screen.getByRole('button', { name: /compartilhar/i }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Não foi possível gerar a imagem agora', 'error'));
    expect(screen.getByRole('button', { name: /compartilhar/i })).not.toBeDisabled();
  });

  it('já começa a carregar as fontes ao aparecer, para o primeiro toque não perder o gesto', () => {
    render(<BotaoCompartilhar area={area} />);
    expect(m.carregar).toHaveBeenCalledOnce();
  });

  it('falha ao gerar fica registrada no console para diagnóstico', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {});
    m.gerar.mockRejectedValue(new Error('toBlob'));
    render(<BotaoCompartilhar area={area} />);
    fireEvent.click(screen.getByRole('button', { name: /compartilhar/i }));
    await waitFor(() => expect(erro).toHaveBeenCalled());
    erro.mockRestore();
  });
});
