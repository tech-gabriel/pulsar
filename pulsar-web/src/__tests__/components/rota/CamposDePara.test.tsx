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

  it('no painel a lista fica no fluxo, para o painel crescer em vez de cortá-la', () => {
    expect(monta(true)).not.toHaveClass('absolute');
  });

  it('no celular a lista flutua sobre o mapa', () => {
    expect(monta(false)).toHaveClass('absolute');
  });
});
