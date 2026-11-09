import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { LocalSalvoDto, SubprefeituraMapaDto } from '../../../types';

vi.mock('../../../hooks/usePrevisaoSubprefeitura', () => ({ usePrevisaoSubprefeitura: () => ({ faixas: [], erro: false }) }));

import FolhaLugar from '../../../components/painel/FolhaLugar';

const casa: LocalSalvoDto = { tipo: 'CASA', latitude: -23.57, longitude: -46.7, rotulo: 'Rua Alvarenga, 1020', subprefeituraId: 'b', subprefeituraNome: 'Butantã' };
const trabalho: LocalSalvoDto = { ...casa, tipo: 'TRABALHO', rotulo: 'Praça da Sé, 1' };

const area = {
  id: 'b', nome: 'Butantã', zona: 'Oeste', latitude: -23.57, longitude: -46.7, faixaRisco: 'BAIXO', temperaturaAtual: 24,
  scoreAtual: { valor: 15, faixa: 'BAIXO', timestamp: '2026-11-09T18:00:00Z' },
  ultimaLeitura: { chuvaMmH: 0, ventoKmH: 5, visibilidadeKm: 10, indiceUv: 2, temperaturaC: 24, sensacaoTermica: 24, umidade: 60, timestamp: '2026-11-09T18:00:00Z' },
  alagamentosCge: [],
} as SubprefeituraMapaDto;

const handlers = () => ({ onFechar: vi.fn(), onVerRegiao: vi.fn(), onRota: vi.fn() });

describe('FolhaLugar', () => {
  it('casa: nome em cima, endereço embaixo, as três linhas e a nota da região', () => {
    render(<FolhaLugar local={casa} area={area} {...handlers()} />);
    expect(screen.getByRole('heading', { name: 'Casa' })).toBeInTheDocument();
    expect(screen.getByText('Rua Alvarenga, 1020')).toBeInTheDocument();
    expect(screen.getByText('Sem chuva agora')).toBeInTheDocument();
    expect(screen.getByText(/Risco tranquilo/)).toBeInTheDocument();
    expect(screen.getByText('Nenhum alagamento agora em Butantã')).toBeInTheDocument();
    expect(screen.getByText('Chuva e risco valem para Butantã, a região da sua casa.')).toBeInTheDocument();
  });

  it('trabalho fala do seu trabalho', () => {
    render(<FolhaLugar local={trabalho} area={area} {...handlers()} />);
    expect(screen.getByRole('heading', { name: 'Trabalho' })).toBeInTheDocument();
    expect(screen.getByText('Chuva e risco valem para Butantã, a região do seu trabalho.')).toBeInTheDocument();
  });

  it('região sem leitura nem score não quebra', () => {
    render(<FolhaLugar local={casa} area={undefined} {...handlers()} />);
    expect(screen.getAllByText('Sem leitura agora').length).toBeGreaterThan(0);
  });

  it('botões chamam quem os usa', () => {
    const h = handlers();
    render(<FolhaLugar local={casa} area={area} {...h} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver Butantã' }));
    fireEvent.click(screen.getByRole('button', { name: /Rota até aqui/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(h.onVerRegiao).toHaveBeenCalled();
    expect(h.onRota).toHaveBeenCalled();
    expect(h.onFechar).toHaveBeenCalled();
  });
});
