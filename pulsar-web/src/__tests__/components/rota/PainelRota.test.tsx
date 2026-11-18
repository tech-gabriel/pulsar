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

  // A rota olha os trechos do caminho; se a área inteira está pior, a linha diz.
  it('trecho do caminho mais calmo que a área: mostra a faixa da área embaixo', () => {
    render(<PainelRota resultado={rota('Esperar')} origem={origem} destino={destino} carregando={false} erro={null}
      avisoPedido={false} onPedirAviso={vi.fn()} faixaDaArea={(id) => (id === 'se' ? 'ALTO' : 'ALTO')} />);
    expect(screen.getByText('área em Alerta')).toBeInTheDocument(); // só a Sé (Tranquilo no caminho)
  });

  it('a faixa de horas só aparece no Esperar (a previsão só estima até quando esperar)', () => {
    for (const estado of ['PodeIr', 'SemDado', 'ComAtencao'] as const) {
      const { unmount } = monta(estado);
      expect(screen.queryByLabelText('Risco nas próximas horas')).not.toBeInTheDocument();
      unmount();
    }
    for (const estado of ['Esperar'] as const) {
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

  it('o aviso de fora diz a cobertura de quem pede a rota', () => {
    render(<PainelRota resultado={null} origem={origem} destino={destino} carregando={false} erro="destinoFora"
      avisoPedido={false} onPedirAviso={vi.fn()} cobertura="São Paulo capital" />);
    expect(screen.getByRole('alert')).toHaveTextContent('O destino fica fora da área coberta (São Paulo capital).');
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

  it('valor estranho no armazenamento cai no padrão', () => {
    localStorage.setItem('pulsar-app-rota', 'uber');
    monta('PodeIr');
    expect(screen.getByRole('link', { name: 'Abrir no Google Maps' })).toBeInTheDocument();
  });

  // Por último entre os que olham o app: o app tocado fica na memória da sessão.
  it('o app lembrado vira o primário, e o último tocado passa a ser o lembrado', () => {
    localStorage.setItem('pulsar-app-rota', 'waze');
    monta('PodeIr');
    expect(screen.getByRole('link', { name: 'Abrir no Waze' })).toHaveClass('rota-primario');
    fireEvent.click(screen.getByRole('link', { name: 'Apple Maps' }));
    expect(localStorage.getItem('pulsar-app-rota')).toBe('apple');
    expect(screen.getByRole('link', { name: 'Abrir no Apple Maps' })).toHaveClass('rota-primario');
    expect(screen.getByRole('link', { name: 'Waze' })).toHaveClass('rota-secundario');
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

  it('o ponto é uma caixa só, com onda, halo e núcleo dentro dela (não lado a lado no cartão)', () => {
    const { container } = monta('Esperar');
    const cartao = container.querySelector('.rota-veredito')!;
    const pontos = cartao.querySelectorAll('.rota-ponto');
    expect(pontos).toHaveLength(1);
    expect(pontos[0]).toHaveAttribute('aria-hidden', 'true');
    expect([...pontos[0].children].map((c) => c.className)).toEqual(['rota-ponto-onda', 'rota-ponto-halo', 'rota-ponto-nucleo']);
    // No cartão, só o ponto e a coluna do texto.
    expect(cartao.children).toHaveLength(2);
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

describe('PainelRota: pendências da revisão', () => {
  const base = { origem, destino, carregando: false, onPedirAviso: vi.fn() };

  it('"Aviso pedido" tem um "Cancelar aviso" secundário que chama o callback', () => {
    const onCancelarAviso = vi.fn();
    render(<PainelRota {...base} resultado={rota('Esperar')} erro={null} avisoPedido onCancelarAviso={onCancelarAviso} />);
    const botao = screen.getByRole('button', { name: 'Cancelar aviso' });
    expect(botao).toHaveClass('rota-secundario');
    fireEvent.click(botao);
    expect(onCancelarAviso).toHaveBeenCalled();
  });

  it.each([['destinoFora', 'Trocar o destino', 'destino'], ['origemFora', 'Trocar a origem', 'origem']] as const)(
    '%s oferece "%s"', (erro, rotulo, ponto) => {
      const onTrocar = vi.fn();
      render(<PainelRota {...base} resultado={null} erro={erro} avisoPedido={false} onTrocar={onTrocar} />);
      fireEvent.click(screen.getByRole('button', { name: rotulo }));
      expect(onTrocar).toHaveBeenCalledWith(ponto);
    });

  it('erro de rede não oferece trocar ponto', () => {
    render(<PainelRota {...base} resultado={null} erro="rede" avisoPedido={false} onTrocar={vi.fn()} onTentarDeNovo={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Trocar/ })).not.toBeInTheDocument();
  });

  it('sem leitura e sem alagamento do CGE: a linha de apoio aparece; com alagamento, não', () => {
    const { unmount } = render(<PainelRota {...base} resultado={rota('SemDado')} erro={null} avisoPedido={false} />);
    expect(screen.getByText('O CGE não registra alagamento no caminho agora.')).toBeInTheDocument();
    unmount();
    const r = rota('SemDado');
    r.trechos[0] = { ...r.trechos[0], alagandoCge: true };
    render(<PainelRota {...base} resultado={r} erro={null} avisoPedido={false} />);
    expect(screen.queryByText('O CGE não registra alagamento no caminho agora.')).not.toBeInTheDocument();
  });

  it('a linha de apoio é só do Sem leitura', () => {
    render(<PainelRota {...base} resultado={rota('PodeIr')} erro={null} avisoPedido={false} />);
    expect(screen.queryByText('O CGE não registra alagamento no caminho agora.')).not.toBeInTheDocument();
  });

  it('mostra "Atualizado às HH:MM" no fuso do navegador', () => {
    const em = new Date(2026, 10, 3, 14, 5).getTime();
    render(<PainelRota {...base} resultado={rota('PodeIr')} erro={null} avisoPedido={false} atualizadoEm={em} />);
    // Dentro do cartão do veredito, fora da frase.
    const linha = screen.getByText('Atualizado às 14:05');
    expect(linha.closest('.rota-veredito')).not.toBeNull();
    expect(linha.closest('.det-hero-frase')).toBeNull();
  });
});

describe('PainelRota: sem salvar casa ou trabalho no resultado', () => {
  it('destino de endereço não mostra Salvar como casa nem trabalho', () => {
    render(<PainelRota resultado={rota('PodeIr')} origem={origem} destino={{ ...destino, fonte: 'endereco' }} carregando={false}
      erro={null} avisoPedido={false} onPedirAviso={vi.fn()}
      // Mesmo quem ainda passe as props antigas não vê os botões.
      {...({ locais: {}, onSalvarLocal: vi.fn().mockResolvedValue(true) } as object)} />);
    expect(screen.queryByRole('button', { name: /Salvar como/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Salvar como/)).not.toBeInTheDocument();
  });
});

// D2 (escolha do user, 18/11/2026): na rota capital ↔ Baixada, a serra entra como uma linha do
// caminho, entre a saída e a chegada, e o veredito fala só da saída e da chegada.
describe('PainelRota entre cidades', () => {
  const ateSantos = (): RotaAvaliacao => ({
    ...rota('PodeIr'),
    trechos: [
      { subprefeituraId: 'se', nome: 'Sé', faixa: 'BAIXO', alagandoCge: false },
      { subprefeituraId: 'santos', nome: 'Santos', faixa: 'BAIXO', alagandoCge: false },
    ],
  });

  it('a serra aparece entre a saída e a chegada, como não avaliada', () => {
    render(<PainelRota resultado={ateSantos()} origem={origem} destino={destino} carregando={false} erro={null}
      avisoPedido={false} onPedirAviso={vi.fn()} atravessaSerra />);
    const linhas = screen.getAllByRole('listitem');
    expect(linhas.map((l) => l.textContent)).toEqual([
      expect.stringContaining('Sé'),
      expect.stringContaining('Serra do Mar'),
      expect.stringContaining('Santos'),
    ]);
    expect(linhas[1]).toHaveTextContent('Não avaliada');
    expect(linhas[1]).toHaveTextContent('Confira a Ecovias antes de descer');
    expect(screen.getByText('A serra não é avaliada: confira a Ecovias antes de descer')).toHaveClass('sr-only');
    expect(screen.getByRole('status')).toHaveTextContent('Sem chuva forte medida na saída e na chegada agora.');
  });

  it('rota dentro da cidade: sem a serra e o texto de sempre', () => {
    monta('PodeIr');
    expect(screen.queryByText(/Serra do Mar/)).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Sem chuva forte medida no caminho agora.');
  });
});
