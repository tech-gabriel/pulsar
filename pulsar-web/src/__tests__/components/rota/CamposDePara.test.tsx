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
  return screen.getByRole('listbox');
};

describe('CamposDePara: sugestões', () => {
  it('não repete a subprefeitura que também veio como endereço', () => {
    monta(false);
    expect(screen.getAllByRole('option', { name: 'Mooca' })).toHaveLength(1);
    expect(screen.getByRole('option', { name: 'Rua da Mooca' })).toBeInTheDocument();
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
    const botao = screen.getByRole('option', { name: 'Rua da Mooca' });
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

describe('CamposDePara: teclado nas sugestões', () => {
  const abre = (destino: { lat: number; lon: number; rotulo: string } | null = null) => {
    const onDestino = vi.fn();
    render(<CamposDePara areas={areas} origem={null} destino={destino} onOrigem={vi.fn()} onDestino={onDestino}
      onInverter={vi.fn()} onFechar={vi.fn()} />);
    const campo = screen.getByRole('combobox', { name: 'Para' });
    fireEvent.change(campo, { target: { value: 'Mooca' } });
    return { campo, onDestino };
  };

  it('lista e opções têm os papéis de listbox, e o campo aponta para ela', () => {
    const { campo } = abre();
    const lista = screen.getByRole('listbox');
    expect(campo).toHaveAttribute('aria-expanded', 'true');
    expect(campo).toHaveAttribute('aria-controls', lista.id);
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('setas andam pelas opções (com volta) e o campo marca a ativa', () => {
    const { campo } = abre();
    const [primeira, segunda] = screen.getAllByRole('option');
    fireEvent.keyDown(campo, { key: 'ArrowDown' });
    expect(campo).toHaveAttribute('aria-activedescendant', primeira.id);
    expect(primeira).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(campo, { key: 'ArrowDown' });
    expect(campo).toHaveAttribute('aria-activedescendant', segunda.id);
    fireEvent.keyDown(campo, { key: 'ArrowDown' });
    expect(campo).toHaveAttribute('aria-activedescendant', primeira.id);
    fireEvent.keyDown(campo, { key: 'ArrowUp' });
    expect(campo).toHaveAttribute('aria-activedescendant', segunda.id);
  });

  it('Enter escolhe a opção ativa', () => {
    const { campo, onDestino } = abre();
    fireEvent.keyDown(campo, { key: 'ArrowDown' });
    fireEvent.keyDown(campo, { key: 'ArrowDown' });
    fireEvent.keyDown(campo, { key: 'Enter' });
    expect(onDestino).toHaveBeenCalledWith(expect.objectContaining({ rotulo: 'Rua da Mooca' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('Enter sem opção ativa não escolhe nada', () => {
    const { campo, onDestino } = abre();
    fireEvent.keyDown(campo, { key: 'Enter' });
    expect(onDestino).not.toHaveBeenCalled();
  });

  it('Esc fecha a lista e devolve o texto do ponto escolhido', () => {
    const { campo, onDestino } = abre({ lat: -23.5, lon: -46.6, rotulo: 'Sé' });
    fireEvent.keyDown(campo, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(campo).toHaveValue('Sé');
    expect(campo).toHaveAttribute('aria-expanded', 'false');
    expect(onDestino).not.toHaveBeenCalled();
  });
});
