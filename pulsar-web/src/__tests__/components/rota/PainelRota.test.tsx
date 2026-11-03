import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
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

describe('PainelRota: hierarquia dos botões por estado', () => {
  const primarios = (c: HTMLElement) => c.querySelectorAll('.rota-primario');
  beforeEach(() => localStorage.clear());

  it.each(['PodeIr', 'ComAtencao'] as const)('%s: um primário, o app lembrado (Google Maps por padrão), e os outros como secundários', (estado) => {
    const { container } = monta(estado);
    expect(primarios(container)).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Abrir no Google Maps' })).toHaveClass('rota-primario');
    expect(screen.getByRole('link', { name: 'Waze' })).toHaveClass('rota-secundario');
    expect(screen.getByRole('link', { name: 'Apple Maps' })).toHaveClass('rota-secundario');
  });

  it('Esperar: o primário é o aviso e os apps viram a linha discreta "Ir mesmo assim"', () => {
    const { container } = monta('Esperar');
    expect(primarios(container)).toHaveLength(1);
    expect(screen.getByRole('button', { name: /Me avise quando melhorar/ })).toHaveClass('rota-primario');
    expect(screen.getByText('Ir mesmo assim:')).toBeInTheDocument();
    for (const nome of ['Google Maps', 'Waze', 'Apple Maps']) expect(screen.getByRole('link', { name: nome })).toHaveClass('rota-sutil');
  });

  it('SemDado: nenhum primário azul, os três apps como secundários', () => {
    const { container } = monta('SemDado');
    expect(primarios(container)).toHaveLength(0);
    for (const nome of ['Google Maps', 'Waze', 'Apple Maps']) expect(screen.getByRole('link', { name: nome })).toHaveClass('rota-secundario');
  });

  it('o app lembrado vira o primário, e o último tocado passa a ser o lembrado', () => {
    localStorage.setItem('pulsar-app-rota', 'waze');
    monta('PodeIr');
    expect(screen.getByRole('link', { name: 'Abrir no Waze' })).toHaveClass('rota-primario');
    fireEvent.click(screen.getByRole('link', { name: 'Apple Maps' }));
    expect(localStorage.getItem('pulsar-app-rota')).toBe('apple');
    expect(screen.getByRole('link', { name: 'Abrir no Apple Maps' })).toHaveClass('rota-primario');
    expect(screen.getByRole('link', { name: 'Waze' })).toHaveClass('rota-secundario');
  });

  it('valor estranho no armazenamento cai no padrão', () => {
    localStorage.setItem('pulsar-app-rota', 'uber');
    monta('PodeIr');
    expect(screen.getByRole('link', { name: 'Abrir no Google Maps' })).toBeInTheDocument();
  });

  it('"Aviso pedido" é um estado de sucesso, não um botão apagado', () => {
    render(<PainelRota resultado={rota('Esperar')} origem={origem} destino={destino} carregando={false} erro={null}
      avisoPedido onPedirAviso={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Me avise|Aviso pedido/ })).not.toBeInTheDocument();
    expect(screen.getByText('Aviso pedido. Te avisamos quando melhorar.')).toHaveAttribute('role', 'status');
  });
});

describe('PainelRota: trecho e veredito', () => {
  it('trecho alagando leva um rótulo só, "Alagando, CGE"', () => {
    const r = rota('Esperar');
    r.trechos[1] = { ...r.trechos[1], alagandoCge: true };
    render(<PainelRota resultado={r} origem={origem} destino={destino} carregando={false} erro={null}
      avisoPedido={false} onPedirAviso={vi.fn()} />);
    expect(screen.getByText('Alagando, CGE')).toBeInTheDocument();
    expect(screen.queryByText('Alerta')).not.toBeInTheDocument();
  });

  it('o cartão do veredito existe já no carregando e não desmonta quando a resposta chega', () => {
    const props = { origem, destino, erro: null, avisoPedido: false, onPedirAviso: vi.fn() };
    const { container, rerender } = render(<PainelRota resultado={null} carregando {...props} />);
    const cartao = container.querySelector('.rota-veredito');
    expect(cartao).toHaveTextContent('Avaliando o caminho…');
    expect(container.querySelector('.rota-ponto')).not.toHaveAttribute('data-pulso');
    rerender(<PainelRota resultado={rota('Esperar')} carregando={false} {...props} />);
    expect(container.querySelector('.rota-veredito')).toBe(cartao);
    expect(cartao).toHaveTextContent(textoVeredito(rota('Esperar')).titulo);
  });

  it.each([['PodeIr', 'chegada'], ['ComAtencao', 'atencao'], ['Esperar', 'esperar']] as const)('%s pulsa (%s); sem leitura nunca', (estado, pulso) => {
    const { container, unmount } = monta(estado);
    expect(container.querySelector('.rota-ponto')).toHaveAttribute('data-pulso', pulso);
    unmount();
    const semDado = monta('SemDado');
    expect(semDado.container.querySelector('.rota-ponto')).not.toHaveAttribute('data-pulso');
  });
});
