import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { SubprefeituraMapaDto } from '../../../types';

// O geocoder devolve o bairro "Mooca" junto com a rua: a subprefeitura já está na lista.
vi.mock('../../../hooks/useBuscaEndereco', () => ({
  useBuscaEndereco: () => ({
    setTermo: vi.fn(), carregando: false, limpar: vi.fn(),
    resultados: [
      { nome: 'Mooca', descricao: 'Mooca, São Paulo', tipo: 'neighbourhood', latitude: -23.55, longitude: -46.6 },
      { nome: 'Rua da Mooca', descricao: 'Rua da Mooca, São Paulo', tipo: 'address', latitude: -23.55, longitude: -46.61 },
    ],
  }),
}));

import CamposDePara from '../../../components/rota/CamposDePara';

const areas = [{ id: 'mooca', nome: 'Mooca', latitude: -23.55, longitude: -46.6 }] as SubprefeituraMapaDto[];

const monta = (embutida: boolean) => {
  render(<CamposDePara areas={areas} origem={null} destino={null} onOrigem={vi.fn()} onDestino={vi.fn()}
    onInverter={vi.fn()} onFechar={vi.fn()} embutida={embutida} />);
  fireEvent.change(screen.getByLabelText('Para'), { target: { value: 'Mooca' } });
  return screen.getByRole('list');
};

describe('CamposDePara: sugestões', () => {
  it('não repete a subprefeitura que também veio como endereço', () => {
    monta(false);
    expect(screen.getAllByRole('button', { name: 'Mooca' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Rua da Mooca' })).toBeInTheDocument();
  });

  it('no painel a lista fica no fluxo e abaixo da cápsula inteira, fora da coluna dos campos', () => {
    const lista = monta(true);
    expect(lista).not.toHaveClass('absolute');
    expect(lista.closest('.mapa-controle')).toBeNull();
    expect(lista.closest('[data-campos-rota]')).not.toBeNull();
  });

  it('no painel escolher uma sugestão funciona (o clique na lista não conta como clique fora)', () => {
    const onDestino = vi.fn();
    render(<CamposDePara areas={areas} origem={null} destino={null} onOrigem={vi.fn()} onDestino={onDestino}
      onInverter={vi.fn()} onFechar={vi.fn()} embutida />);
    fireEvent.change(screen.getByLabelText('Para'), { target: { value: 'Mooca' } });
    const botao = screen.getByRole('button', { name: 'Rua da Mooca' });
    fireEvent.mouseDown(botao);
    fireEvent.click(botao);
    expect(onDestino).toHaveBeenCalledWith(expect.objectContaining({ rotulo: 'Rua da Mooca' }));
  });

  it('no celular a lista flutua sobre o mapa', () => {
    const lista = monta(false);
    expect(lista).toHaveClass('absolute');
    expect(lista.closest('.mapa-controle')).not.toBeNull();
  });
});
