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
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('1 em alerta, 1 em atenção');
    expect(screen.getByText('Suas subprefeituras')).toBeInTheDocument();
    expect(screen.getByText('Em risco agora')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Itaquera/ }));
    expect(onSelecionar).toHaveBeenCalledWith(itaquera);
  });

  it('favorita em atenção não se repete em "Em atenção agora"', () => {
    render(<PainelLateral {...base} areas={[itaquera, mooca, penha]} favoritas={[mooca]} onSelecionar={vi.fn()} />);
    expect(screen.getAllByRole('button', { name: /Mooca/ })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /Itaquera/ })).toHaveLength(1);
  });

  it('só favoritas em atenção: a seção em atenção some', () => {
    render(<PainelLateral {...base} areas={[mooca, penha]} favoritas={[mooca]} onSelecionar={vi.fn()} />);
    expect(screen.queryByText('Em risco agora')).not.toBeInTheDocument();
  });

  it('dia tranquilo: sem a seção em atenção', () => {
    render(<PainelLateral {...base} areas={[penha]} favoritas={[]} onSelecionar={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Tudo tranquilo em São Paulo');
    expect(screen.queryByText('Em risco agora')).not.toBeInTheDocument();
  });

  it('ver todas: lista completa, pior primeiro, com busca e voltar', () => {
    render(<PainelLateral {...base} areas={[penha, mooca, itaquera]} favoritas={[]} onSelecionar={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver as 3 subprefeituras' }));
    const nomes = screen.getAllByRole('button').map((b) => b.textContent ?? '').filter((t) => /Itaquera|Mooca|Penha/.test(t));
    expect(nomes[0]).toMatch(/Itaquera/);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'pen' } });
    expect(screen.queryByRole('button', { name: /Mooca/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByText('Em risco agora')).toBeInTheDocument();
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

// D1 (escolha do user, 18/11/2026): com duas cidades, um seletor no topo troca o resumo, a lista
// de risco e o "ver todas"; as suas áreas aparecem sempre, das duas cidades.
describe('PainelLateral com duas cidades', () => {
  const baixada = (id: string, nome: string, valor: number, faixa: Area['faixaRisco']): Area =>
    ({ ...a(id, nome, valor, faixa), zona: 'Baixada Santista', cidade: 'Baixada Santista' });
  const santos = baixada('b1', 'Santos', 70, 'ALTO');
  const cubatao = baixada('b2', 'Cubatão', 10, 'BAIXO');
  const areas = [itaquera, mooca, penha, santos, cubatao];

  it('na Baixada: o resumo e a lista são dela; a favorita da capital continua', () => {
    const onTrocarCidade = vi.fn();
    render(<PainelLateral {...base} areas={areas} favoritas={[penha]} onSelecionar={vi.fn()}
      cidade="Baixada Santista" onTrocarCidade={onTrocarCidade} />);
    expect(screen.getByText('Baixada Santista agora')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('1 em alerta');
    expect(screen.getByText('Suas áreas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Penha/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Santos/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Itaquera/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver os 2 municípios/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'São Paulo' }));
    expect(onTrocarCidade).toHaveBeenCalledWith('São Paulo');
    expect(screen.getByRole('button', { name: 'Baixada Santista' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('só a capital: sem seletor e o texto de sempre', () => {
    render(<PainelLateral {...base} areas={[itaquera, penha]} favoritas={[penha]} onSelecionar={vi.fn()} />);
    expect(screen.queryByRole('group', { name: 'Cidade' })).not.toBeInTheDocument();
    expect(screen.getByText('Suas subprefeituras')).toBeInTheDocument();
  });
});
