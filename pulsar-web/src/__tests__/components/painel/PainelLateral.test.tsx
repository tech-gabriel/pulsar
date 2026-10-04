import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PainelLateral from '../../../components/painel/PainelLateral';
import type { Area } from '../../../features/cidade/areas';

const a = (id: string, nome: string, valor: number, faixa: Area['faixaRisco']): Area => ({
  id, nome, zona: 'Leste', latitude: 0, longitude: 0, temperaturaAtual: 20, ultimaLeitura: null, faixaRisco: faixa,
  scoreAtual: { valor, faixa, timestamp: '', perigoPrincipal: 'ALAGAMENTO' },
});
const itaquera = a('s1', 'Itaquera', 78, 'ALTO');
const mooca = a('s2', 'Mooca', 49, 'MODERADO');
const penha = a('s3', 'Penha', 12, 'BAIXO');
const base = { carregando: false, erro: null, ultimaAtualizacao: null, onRecarregar: vi.fn() };

describe('PainelLateral (B)', () => {
  it('cidade agora, suas e em atenção; abre a área', () => {
    const onSelecionar = vi.fn();
    render(<PainelLateral {...base} areas={[itaquera, mooca, penha]} favoritas={[penha]} onSelecionar={onSelecionar} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('1 em risco alto, 1 em atenção');
    expect(screen.getByText('Suas subprefeituras')).toBeInTheDocument();
    expect(screen.getByText('Em atenção agora')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Itaquera/ }));
    expect(onSelecionar).toHaveBeenCalledWith(itaquera);
  });

  it('dia tranquilo: sem a seção em atenção', () => {
    render(<PainelLateral {...base} areas={[penha]} favoritas={[]} onSelecionar={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Tudo tranquilo em São Paulo');
    expect(screen.queryByText('Em atenção agora')).not.toBeInTheDocument();
  });

  it('ver todas: lista completa, pior primeiro, com busca e voltar', () => {
    render(<PainelLateral {...base} areas={[penha, mooca, itaquera]} favoritas={[]} onSelecionar={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver as 3 subprefeituras' }));
    const nomes = screen.getAllByRole('button').map((b) => b.textContent ?? '').filter((t) => /Itaquera|Mooca|Penha/.test(t));
    expect(nomes[0]).toMatch(/Itaquera/);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'pen' } });
    expect(screen.queryByRole('button', { name: /Mooca/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByText('Em atenção agora')).toBeInTheDocument();
  });

  it('erro de carga aparece com o recarregar', () => {
    render(<PainelLateral {...base} erro="Falha" areas={[]} favoritas={[]} onSelecionar={vi.fn()} />);
    expect(screen.getByText('Falha na conexão')).toBeInTheDocument();
  });

  it('não fala em região', () => {
    const { container } = render(<PainelLateral {...base} areas={[itaquera, mooca]} favoritas={[mooca]} onSelecionar={vi.fn()} />);
    expect(container.textContent).not.toMatch(/regi(ão|ões)/i);
  });
});
