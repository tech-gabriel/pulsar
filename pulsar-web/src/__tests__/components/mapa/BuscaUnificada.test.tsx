import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EnderecoBusca } from '../../../types';

const setTermo = vi.fn();
const limpar = vi.fn();

interface HookState {
  termo: string;
  setTermo: typeof setTermo;
  resultados: EnderecoBusca[];
  carregando: boolean;
  erro: string | null;
  limpar: typeof limpar;
}

let hookState: HookState;

vi.mock('../../../hooks/useBuscaEndereco', () => ({
  useBuscaEndereco: () => hookState,
}));

import BuscaUnificada from '../../../components/mapa/BuscaUnificada';
import { numeroFaltando } from '../../../utils/busca';
import type { Area } from '../../../features/cidade/areas';

const resultados: EnderecoBusca[] = [
  { nome: 'Av. Paulista', descricao: 'Av. Paulista, São Paulo', tipo: 'address', latitude: -23.561, longitude: -46.656 },
];

beforeEach(() => {
  vi.clearAllMocks();
  hookState = { termo: '', setTermo, resultados: [], carregando: false, erro: null, limpar };
});

describe('BuscaUnificada', () => {
  it('renderiza o campo de busca', () => {
    render(<BuscaUnificada areas={[]} onSelecionarArea={vi.fn()} onSelecionar={vi.fn()} isMobile={false} />);
    expect(screen.getByLabelText('Buscar subprefeitura ou endereço')).toBeInTheDocument();
  });

  it('chama setTermo ao digitar', () => {
    render(<BuscaUnificada areas={[]} onSelecionarArea={vi.fn()} onSelecionar={vi.fn()} isMobile={false} />);
    fireEvent.change(screen.getByLabelText('Buscar subprefeitura ou endereço'), {
      target: { value: 'paulista' },
    });
    expect(setTermo).toHaveBeenCalledWith('paulista');
  });

  it('lista resultados e dispara onSelecionar ao clicar', () => {
    hookState = { termo: 'paulista', setTermo, resultados, carregando: false, erro: null, limpar };
    const onSelecionar = vi.fn();
    render(<BuscaUnificada areas={[]} onSelecionarArea={vi.fn()} onSelecionar={onSelecionar} isMobile={false} />);

    // foco abre o dropdown (termo já tem >= 3 chars)
    fireEvent.focus(screen.getByLabelText('Buscar subprefeitura ou endereço'));
    fireEvent.click(screen.getByText('Av. Paulista'));

    expect(onSelecionar).toHaveBeenCalledWith(resultados[0], undefined);
  });

  it('setas levam do campo para a lista e andam entre os itens; Escape volta ao campo', () => {
    hookState = { termo: 'paulista', setTermo, resultados, carregando: false, erro: null, limpar };
    render(<BuscaUnificada areas={[]} onSelecionarArea={vi.fn()} onSelecionar={vi.fn()} isMobile={false} />);
    const campo = screen.getByLabelText('Buscar subprefeitura ou endereço');
    fireEvent.focus(campo);
    fireEvent.keyDown(campo, { key: 'ArrowDown' });
    const primeiro = screen.getByText('Av. Paulista').closest('button')!;
    expect(primeiro).toHaveFocus();
    fireEvent.keyDown(primeiro, { key: 'ArrowUp' });
    expect(campo).toHaveFocus();
    fireEvent.keyDown(campo, { key: 'ArrowDown' });
    fireEvent.keyDown(primeiro, { key: 'Escape' });
    expect(campo).toHaveFocus();
  });

  it('limpa a busca ao clicar no X', () => {
    hookState = { termo: 'paulista', setTermo, resultados: [], carregando: false, erro: null, limpar };
    render(<BuscaUnificada areas={[]} onSelecionarArea={vi.fn()} onSelecionar={vi.fn()} isMobile={false} />);
    fireEvent.click(screen.getByLabelText('Limpar busca'));
    expect(limpar).toHaveBeenCalled();
  });
});

describe('BuscaEndereco — botão de localização', () => {
  beforeEach(() => localStorage.clear());

  it('dispara onUsarLocalizacao ao clicar no botão', () => {
    const onUsar = vi.fn();
    render(<BuscaUnificada areas={[]} onSelecionarArea={vi.fn()} onSelecionar={() => {}} isMobile={false} onUsarLocalizacao={onUsar} />);
    fireEvent.click(screen.getByRole('button', { name: /usar minha localização/i }));
    expect(onUsar).toHaveBeenCalledTimes(1);
  });

  it('desabilita o botão enquanto localizando', () => {
    render(<BuscaUnificada areas={[]} onSelecionarArea={vi.fn()} onSelecionar={() => {}} isMobile={false} onUsarLocalizacao={() => {}} localizando />);
    expect(screen.getByRole('button', { name: /usar minha localização/i })).toBeDisabled();
  });

  it('mostra a dica na 1ª visita e a esconde ao clicar no botão', () => {
    render(<BuscaUnificada areas={[]} onSelecionarArea={vi.fn()} onSelecionar={() => {}} isMobile={false} onUsarLocalizacao={() => {}} />);
    expect(screen.getByText('Toque no alvo para ver a sua subprefeitura')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /usar minha localização/i }));
    expect(screen.queryByText('Toque no alvo para ver a sua subprefeitura')).not.toBeInTheDocument();
  });

  it('dentro do painel não mostra a dica nem o anel: sozinho ele parecia o foco do teclado (crítica 8)', () => {
    render(<BuscaUnificada areas={[]} onSelecionarArea={vi.fn()} onSelecionar={() => {}} isMobile={false} onUsarLocalizacao={() => {}} embutida />);
    expect(screen.queryByText('Toque no alvo para ver a sua subprefeitura')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /usar minha localização/i })).not.toHaveClass('animate-pulse');
  });

  it('com a frase da dica, o alvo pulsa junto', () => {
    render(<BuscaUnificada areas={[]} onSelecionarArea={vi.fn()} onSelecionar={() => {}} isMobile onUsarLocalizacao={() => {}} />);
    expect(screen.getByRole('button', { name: /usar minha localização/i })).toHaveClass('animate-pulse');
  });

  it('não mostra a dica quando ela já foi vista', () => {
    localStorage.setItem('pulsar-dica-localizacao-vista', '1');
    render(<BuscaUnificada areas={[]} onSelecionarArea={vi.fn()} onSelecionar={() => {}} isMobile={false} onUsarLocalizacao={() => {}} />);
    expect(screen.queryByText('Toque no alvo para ver a sua subprefeitura')).not.toBeInTheDocument();
  });

  it('mostra subprefeituras antes dos endereços e abre a escolhida', () => {
    const onSelecionarArea = vi.fn();
    const mooca = { id: 's2', nome: 'Mooca', zona: 'Leste', faixaRisco: 'MODERADO' } as Area;
    hookState = { ...hookState, termo: 'mo', resultados };
    render(<BuscaUnificada areas={[mooca]} onSelecionarArea={onSelecionarArea} onSelecionar={vi.fn()} isMobile={false} />);
    fireEvent.focus(screen.getByLabelText('Buscar subprefeitura ou endereço'));
    expect(screen.getByText('Subprefeituras')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Mooca/ }));
    expect(onSelecionarArea).toHaveBeenCalledWith(mooca);
  });

  // Santos não é subprefeitura: com as duas cidades na lista, o grupo vira "Áreas".
  it('com a Baixada na lista, o grupo das áreas não se chama "Subprefeituras"', () => {
    const santos = { id: 'b1', nome: 'Santos', zona: 'Baixada Santista', cidade: 'Baixada Santista', faixaRisco: 'BAIXO' } as Area;
    const sao = { id: 's9', nome: 'Sapopemba', zona: 'Leste', cidade: 'São Paulo', faixaRisco: 'BAIXO' } as Area;
    hookState = { ...hookState, termo: 'sa', resultados };
    render(<BuscaUnificada areas={[sao, santos]} onSelecionarArea={vi.fn()} onSelecionar={vi.fn()} isMobile={false} />);
    fireEvent.focus(screen.getByLabelText('Buscar subprefeitura ou endereço'));
    expect(screen.getByText('Áreas')).toBeInTheDocument();
    expect(screen.queryByText('Subprefeituras')).not.toBeInTheDocument();
  });

  it('sem subprefeitura nem endereço: mensagem única', () => {
    hookState = { ...hookState, termo: 'xyzw', resultados: [] };
    render(<BuscaUnificada areas={[]} onSelecionarArea={vi.fn()} onSelecionar={vi.fn()} isMobile={false} />);
    fireEvent.focus(screen.getByLabelText('Buscar subprefeitura ou endereço'));
    expect(screen.getByText('Nenhuma subprefeitura ou endereço com esse nome.')).toBeInTheDocument();
  });
});

describe('BuscaUnificada: rota', () => {
  it('o botão Rota é só o ícone e chama onAbrirRota', () => {
    const onAbrirRota = vi.fn();
    render(<BuscaUnificada areas={[] as Area[]} onSelecionarArea={vi.fn()} onSelecionar={vi.fn()} isMobile={false} onAbrirRota={onAbrirRota} />);
    const botao = screen.getByRole('button', { name: 'Rota' });
    expect(botao).toHaveAttribute('title', 'Rota');
    expect(botao).toHaveTextContent(/^$/);
    fireEvent.click(botao);
    expect(onAbrirRota).toHaveBeenCalled();
  });
});

// O MapTiler não conhece todo número: quem digitou "1000" e escolheu a rua precisa ajustar o pino.
describe('numeroFaltando', () => {
  const r = (nome: string, descricao = '') => ({ nome, descricao } as EnderecoBusca);
  it('número digitado que o resultado não tem', () => {
    expect(numeroFaltando('Rua da Mooca 1000', r('Rua da Mooca', 'Rua da Mooca, São Paulo 03104-000'))).toBe('1000');
  });
  it('resultado com o número: nada falta', () => {
    expect(numeroFaltando('Rua da Mooca 1001', r('Rua Da Mooca 1001'))).toBeUndefined();
  });
  it('sem número digitado: nada falta', () => {
    expect(numeroFaltando('Rua da Mooca', r('Rua da Mooca'))).toBeUndefined();
  });
  it('não confunde 100 com 1000', () => {
    expect(numeroFaltando('Rua X 100', r('Rua X 1000'))).toBe('100');
  });
});

describe('numeroFaltando: rua com número no nome e CEP', () => {
  const r = (nome: string, descricao = '') => ({ nome, descricao } as EnderecoBusca);
  it('o número da casa é o último digitado', () => {
    expect(numeroFaltando('Rua 25 de Março 100', r('Rua 25 de Março', 'Rua 25 de Março, São Paulo'))).toBe('100');
  });
  it('o CEP do resultado não conta como o número', () => {
    expect(numeroFaltando('Rua X 100', r('Rua X', 'Rua X, São Paulo 01000-100'))).toBe('100');
  });
});
