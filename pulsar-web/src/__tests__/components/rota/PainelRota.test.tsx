import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PainelRota from '../../../components/rota/PainelRota';
import { textoVeredito } from '../../../features/rota/textos';
import { linksNavegacao } from '../../../features/rota/links';
import type { EstadoRota, RotaAvaliacao } from '../../../features/rota/tipos';

const origem = { lat: -23.55, lon: -46.63, rotulo: 'Minha localização' };
const destino = { lat: -23.54, lon: -46.6, rotulo: 'Rua da Mooca, 1000' };

const rota = (estado: EstadoRota): RotaAvaliacao => ({
  estado,
  trechoDecisivoId: 'mooca',
  tranquiloAteUtc: '2026-11-03T18:00:00Z',
  esperarAteUtc: '2026-11-03T16:00:00Z',
  horas: [
    { inicioUtc: '2026-11-03T14:00:00Z', piorFaixa: 'MODERADO' },
    { inicioUtc: '2026-11-03T15:00:00Z', piorFaixa: 'BAIXO' },
  ],
  trechos: [
    { subprefeituraId: 'se', nome: 'Sé', faixa: 'BAIXO', alagandoCge: false },
    { subprefeituraId: 'mooca', nome: 'Mooca', faixa: estado === 'SemDado' ? null : 'ALTO', alagandoCge: false },
  ],
});

const monta = (estado: EstadoRota) =>
  render(<PainelRota resultado={rota(estado)} origem={origem} destino={destino} carregando={false} erro={null}
    avisoPedido={false} onPedirAviso={vi.fn()} />);

describe('PainelRota', () => {
  it.each(['PodeIr', 'ComAtencao', 'Esperar', 'SemDado'] as const)('mostra título e detalhe do veredito %s', (estado) => {
    monta(estado);
    const { titulo, detalhe } = textoVeredito(rota(estado));
    expect(screen.getByText(titulo)).toBeInTheDocument();
    expect(screen.getByText(detalhe)).toBeInTheDocument();
  });

  it('lista os trechos com o nome da API e o rótulo da faixa', () => {
    monta('Esperar');
    expect(screen.getByText('Sé')).toBeInTheDocument();
    expect(screen.getByText('Mooca')).toBeInTheDocument();
    expect(screen.getByText('Alerta')).toBeInTheDocument();
  });

  it('a faixa de horas só aparece em ComAtencao e Esperar', () => {
    for (const estado of ['PodeIr', 'SemDado'] as const) {
      const { unmount } = monta(estado);
      expect(screen.queryByLabelText('Risco nas próximas horas')).not.toBeInTheDocument();
      unmount();
    }
    for (const estado of ['ComAtencao', 'Esperar'] as const) {
      const { unmount } = monta(estado);
      expect(screen.getByLabelText('Risco nas próximas horas')).toBeInTheDocument();
      unmount();
    }
  });

  it('botão principal: Google Maps no PodeIr, Me avise no Esperar', () => {
    const { unmount } = monta('PodeIr');
    expect(screen.getByRole('link', { name: /Abrir no Google Maps/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Me avise/ })).not.toBeInTheDocument();
    unmount();
    monta('Esperar');
    expect(screen.getByRole('button', { name: /Me avise quando melhorar/ })).toBeInTheDocument();
  });

  it('os três links levam o href da navegação', () => {
    monta('PodeIr');
    const l = linksNavegacao(origem, destino);
    expect(screen.getByRole('link', { name: /Google Maps/ })).toHaveAttribute('href', l.google);
    expect(screen.getByRole('link', { name: 'Waze' })).toHaveAttribute('href', l.waze);
    expect(screen.getByRole('link', { name: 'Apple Maps' })).toHaveAttribute('href', l.apple);
  });

  it('carregando e erro não mostram veredito', () => {
    const { unmount } = render(<PainelRota resultado={null} origem={origem} destino={destino} carregando erro={null}
      avisoPedido={false} onPedirAviso={vi.fn()} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    unmount();
    render(<PainelRota resultado={null} origem={origem} destino={destino} carregando={false} erro="destinoFora"
      avisoPedido={false} onPedirAviso={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/fora/i);
  });
});

describe('PainelRota: erro de rede e aviso', () => {
  it('erro de rede mostra "Tentar de novo" e chama o callback', () => {
    const onTentarDeNovo = vi.fn();
    render(<PainelRota resultado={null} origem={origem} destino={destino} carregando={false} erro="rede"
      avisoPedido={false} onPedirAviso={vi.fn()} onTentarDeNovo={onTentarDeNovo} />);
    screen.getByRole('button', { name: 'Tentar de novo' }).click();
    expect(onTentarDeNovo).toHaveBeenCalled();
  });

  it('o botão de aviso fica desabilitado enquanto o push carrega', () => {
    render(<PainelRota resultado={rota('Esperar')} origem={origem} destino={destino} carregando={false} erro={null}
      avisoPedido={false} onPedirAviso={vi.fn()} avisoIndisponivel />);
    expect(screen.getByRole('button', { name: /Me avise quando melhorar/ })).toBeDisabled();
  });
});

describe('VereditoRota', () => {
  it('o bloco do veredito é uma região aria-live', () => {
    monta('PodeIr');
    expect(screen.getByText(textoVeredito(rota('PodeIr')).titulo).closest('[aria-live]')).toHaveAttribute('aria-live', 'polite');
  });
});
