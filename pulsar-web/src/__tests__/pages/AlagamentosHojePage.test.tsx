import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RiscoAgoraPublico } from '../../types';

const estado = vi.hoisted(() => ({
  risco: { dados: null as RiscoAgoraPublico[] | null, erro: false, atualizar: () => {} },
  usuario: null as object | null,
}));

vi.mock('../../hooks/useSeoHead', () => ({ useSeoHead: () => {} }));
vi.mock('../../hooks/useRiscoAgora', () => ({ useRiscoAgora: () => estado.risco }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ usuario: estado.usuario }) }));
vi.mock('../../features/alagamentosHoje/MapaPerto', () => ({ default: () => <div data-testid="mapa-perto" /> }));

const PUBLICO = join(__dirname, '../../../public');
const leve = JSON.parse(readFileSync(join(PUBLICO, 'subprefeituras-leve.geojson'), 'utf8'));
const pontos = JSON.parse(readFileSync(join(PUBLICO, 'pontos-alagamento.json'), 'utf8'));
vi.mock('../../hooks/useJsonPublico', () => ({
  useJsonPublico: (url: string, ativo: boolean) => ({ dados: ativo ? (url.includes('leve') ? leve : pontos) : null, erro: false }),
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
});
