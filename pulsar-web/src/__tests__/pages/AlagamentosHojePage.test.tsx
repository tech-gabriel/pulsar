import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RiscoAgoraPublico } from '../../types';

const estado = vi.hoisted(() => ({
  risco: { dados: null as RiscoAgoraPublico[] | null, erro: false, atualizar: () => {} },
  usuario: null as object | null,
  falhaJson: '' as string, // trecho da URL que deve falhar
  semDados: '' as string, // trecho da URL que fica carregando
}));

vi.mock('../../hooks/useSeoHead', () => ({ useSeoHead: () => {} }));
vi.mock('../../hooks/useRiscoAgora', () => ({ useRiscoAgora: () => estado.risco }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ usuario: estado.usuario }) }));
vi.mock('../../features/alagamentosHoje/MapaPerto', () => ({ default: () => <div data-testid="mapa-perto" /> }));

const PUBLICO = join(__dirname, '../../../public');
const leve = JSON.parse(readFileSync(join(PUBLICO, 'subprefeituras-leve.geojson'), 'utf8'));
const pontos = JSON.parse(readFileSync(join(PUBLICO, 'pontos-alagamento.json'), 'utf8'));
vi.mock('../../hooks/useJsonPublico', () => ({
  useJsonPublico: (url: string, ativo: boolean) => {
    if (!ativo || (estado.semDados && url.includes(estado.semDados))) return { dados: null, erro: false };
    if (estado.falhaJson && url.includes(estado.falhaJson)) return { dados: null, erro: true };
    return { dados: url.includes('leve') ? leve : pontos, erro: false };
  },
}));

import AlagamentosHojePage from '../../pages/AlagamentosHojePage';

const mooca = (over: Partial<RiscoAgoraPublico> = {}): RiscoAgoraPublico => ({
  nome: 'Mooca', faixaRisco: 'MODERADO', score: 47, atualizadoEmUtc: '2026-11-02T19:20:00Z',
  perigoPrincipal: 'ALAGAMENTO', chuva3hMm: 12.3, ventoKmH: 10, sensacaoTermica: 24, alagamentosCge: [], ...over,
});

const abrir = () => render(<MemoryRouter><AlagamentosHojePage /></MemoryRouter>);
const escolherBairro = (nome: string) => {
  const campo = screen.getByLabelText(/bairro/i);
  fireEvent.change(campo, { target: { value: nome } });
};

function geolocalizacao(impl: (ok: PositionCallback, erro: PositionErrorCallback) => void) {
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: impl } });
}

describe('AlagamentosHojePage', () => {
  beforeEach(() => {
    estado.risco = { dados: [mooca()], erro: false, atualizar: () => {} };
    estado.usuario = null;
    estado.falhaJson = '';
    estado.semDados = '';
  });

  it('sem escolha: título, escolha da região, ranking e nenhuma faixa de risco', () => {
    abrir();
    expect(screen.getByRole('heading', { level: 1, name: 'Pontos de alagamento em SP hoje' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver a minha região/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/bairro/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Onde mais alagou em SP' })).toBeInTheDocument();
    expect(screen.queryByText(/Tranquilo|Atenção|Alerta/)).not.toBeInTheDocument();
  });

  it('escolher o bairro mostra o risco da subprefeitura com o motivo e o convite com a região', () => {
    abrir();
    escolherBairro('Tatuapé');
    const risco = screen.getByRole('region', { name: /Risco agora na Mooca/ });
    expect(within(risco).getByText('Atenção')).toBeInTheDocument();
    expect(within(risco).getByText('Por chuva: 12,3 mm nas últimas 3h')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Receba o alerta da Mooca no celular' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Criar conta grátis' })).toHaveAttribute('href', '/cadastro?regiao=mooca');
    expect(screen.getByText(/alagamentos? registrados? na Mooca/)).toBeInTheDocument();
  });

  it('risco que não carregou: avisa e oferece tentar de novo, sem dizer Tranquilo', () => {
    estado.risco = { dados: null, erro: true, atualizar: vi.fn() };
    abrir();
    escolherBairro('Mooca');
    expect(screen.getByText(/Não deu para carregar o risco agora/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(estado.risco.atualizar).toHaveBeenCalled();
    expect(screen.queryByText('Tranquilo')).not.toBeInTheDocument();
  });

  it('localização negada: explica e deixa a escolha do bairro', async () => {
    geolocalizacao((_ok, erro) => erro({ code: 1 } as GeolocationPositionError));
    abrir();
    fireEvent.click(screen.getByRole('button', { name: /Ver a minha região/ }));
    expect(await screen.findByText(/Sem acesso à localização/)).toBeInTheDocument();
    expect(screen.getByLabelText(/bairro/i)).toBeInTheDocument();
  });

  it('localização fora do município: diz que fica fora da cidade', async () => {
    geolocalizacao((ok) => ok({ coords: { latitude: -23.4628, longitude: -46.5333, accuracy: 30 } } as GeolocationPosition));
    abrir();
    fireEvent.click(screen.getByRole('button', { name: /Ver a minha região/ }));
    expect(await screen.findByText(/fora da cidade de São Paulo/)).toBeInTheDocument();
  });

  it('localização na Mooca: conta os alagamentos a até 2 km de você', async () => {
    geolocalizacao((ok) => ok({ coords: { latitude: -23.5489, longitude: -46.6001, accuracy: 30 } } as GeolocationPosition));
    abrir();
    fireEvent.click(screen.getByRole('button', { name: /Ver a minha região/ }));
    await waitFor(() => expect(screen.getByRole('region', { name: /Risco agora na Mooca/ })).toBeInTheDocument());
    expect(screen.getByText(/a até 2 km de você/)).toBeInTheDocument();
  });

  it('logado: o convite leva ao mapa da região', () => {
    estado.usuario = { id: 'u1' };
    abrir();
    escolherBairro('Mooca');
    expect(screen.getByRole('link', { name: 'Ver a Mooca no mapa' })).toHaveAttribute('href', '/app?regiao=mooca');
  });

  it('alagamento ativo do CGE aparece com a rua; sem ponto, o card não aparece', () => {
    estado.risco = { dados: [mooca({ alagamentosCge: [{ via: 'Av. do Estado', referencia: 'Viaduto Glicério', inicioUtc: '2026-11-02T18:52:00Z', transitavel: false }] })], erro: false, atualizar: () => {} };
    const { unmount } = abrir();
    escolherBairro('Mooca');
    const card = screen.getByRole('region', { name: 'Alagando agora' });
    expect(within(card).getByText('Av. do Estado')).toBeInTheDocument();
    unmount();
    estado.risco = { dados: [mooca()], erro: false, atualizar: () => {} };
    abrir();
    escolherBairro('Mooca');
    expect(screen.queryByRole('region', { name: 'Alagando agora' })).not.toBeInTheDocument();
  });

  it('digitar letra a letra não escolhe no meio: Vila Maria a caminho de Vila Mariana', () => {
    abrir();
    const campo = screen.getByLabelText(/bairro/i);
    for (const parcial of ['Vila', 'Vila Maria', 'Vila Mariana']) fireEvent.input(campo, { target: { value: parcial }, inputType: 'insertText' });
    expect(screen.queryByRole('region', { name: /Risco agora/ })).not.toBeInTheDocument();
    fireEvent.keyDown(campo, { key: 'Enter' });
    expect(screen.getByRole('region', { name: /Risco agora na Vila Mariana/ })).toBeInTheDocument();
  });

  it('contorno que não baixa: sai do Procurando e pede o bairro', async () => {
    estado.falhaJson = 'leve';
    geolocalizacao((ok) => ok({ coords: { latitude: -23.5489, longitude: -46.6001, accuracy: 30 } } as GeolocationPosition));
    abrir();
    fireEvent.click(screen.getByRole('button', { name: /Ver a minha região/ }));
    expect(await screen.findByText(/Não deu para achar a sua região/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver a minha região/ })).toBeEnabled();
  });

  it('pontos carregando ou com erro nunca dizem 0 alagamentos', () => {
    estado.semDados = 'pontos';
    const { unmount } = abrir();
    escolherBairro('Mooca');
    expect(screen.getByText(/Carregando os alagamentos/)).toBeInTheDocument();
    expect(screen.queryByText(/^0 alagamentos/)).not.toBeInTheDocument();
    unmount();
    estado.semDados = '';
    estado.falhaJson = 'pontos';
    abrir();
    escolherBairro('Mooca');
    expect(screen.getByText(/Não deu para carregar os alagamentos/)).toBeInTheDocument();
  });

  it('zero alagamentos de verdade vira frase honesta', async () => {
    geolocalizacao((ok) => ok({ coords: { latitude: -23.9001, longitude: -46.7001, accuracy: 30 } } as GeolocationPosition));
    abrir();
    fireEvent.click(screen.getByRole('button', { name: /Ver a minha região/ }));
    expect(await screen.findByText(/Nenhum alagamento registrado a até 2 km de você/)).toBeInTheDocument();
  });

  it('sem score: diz que está sem leitura, nunca Tranquilo', () => {
    estado.risco = { dados: [mooca({ score: null, atualizadoEmUtc: null, faixaRisco: 'BAIXO' })], erro: false, atualizar: () => {} };
    abrir();
    escolherBairro('Mooca');
    expect(screen.getByText(/Sem leitura agora/)).toBeInTheDocument();
    expect(screen.queryByText('Tranquilo')).not.toBeInTheDocument();
  });
});
