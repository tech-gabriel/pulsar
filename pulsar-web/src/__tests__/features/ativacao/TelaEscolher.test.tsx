import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import TelaEscolher from '../../../features/ativacao/telas/TelaEscolher';

const subs = [
  { id: 's1', nome: 'Mooca', zona: 'Leste', faixaRisco: 'BAIXO' as const },
  { id: 's2', nome: 'Penha', zona: 'Leste', faixaRisco: 'MODERADO' as const },
  { id: 's3', nome: 'São Miguel', zona: 'Leste', faixaRisco: 'BAIXO' as const },
];

describe('TelaEscolher', () => {
  it('a localização marca a subprefeitura detectada', async () => {
    render(<TelaEscolher subprefeituras={subs} localizar={vi.fn().mockResolvedValue('s2')} onContinuar={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Usar minha localização/ }));
    expect(await screen.findByText('Você está na Penha')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Penha' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Continuar · 1' })).toBeEnabled();
  });

  it('localização negada ou fora de SP: pede para escolher na lista', async () => {
    render(<TelaEscolher subprefeituras={subs} localizar={vi.fn().mockResolvedValue(null)} onContinuar={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Usar minha localização/ }));
    expect(await screen.findByText('Escolha na lista abaixo')).toBeInTheDocument();
  });

  it('busca sem acento filtra a lista', () => {
    render(<TelaEscolher subprefeituras={subs} localizar={vi.fn()} onContinuar={vi.fn()} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'sao mig' } });
    expect(screen.getByRole('checkbox', { name: 'São Miguel' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Mooca' })).not.toBeInTheDocument();
  });

  it('salva só no Continuar e não avança se falhar', async () => {
    const onContinuar = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(<TelaEscolher subprefeituras={subs} localizar={vi.fn()} onContinuar={onContinuar} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mooca' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Penha' }));
    expect(onContinuar).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Continuar · 2' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não conseguimos salvar. Tente de novo.');
    expect(onContinuar).toHaveBeenCalledWith(['s1', 's2']);

    fireEvent.click(screen.getByRole('button', { name: 'Continuar · 2' }));
    await waitFor(() => expect(onContinuar).toHaveBeenCalledTimes(2));
  });

  it('sem nada marcado o Continuar fica desabilitado', () => {
    render(<TelaEscolher subprefeituras={subs} localizar={vi.fn()} onContinuar={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Continuar · 0' })).toBeDisabled();
  });
});

describe('TelaEscolher com região pendente da página pública', () => {
  it('abre com a subprefeitura marcada, não salva sozinha e limpa ao continuar', async () => {
    localStorage.clear();
    const { guardarRegiaoPendente, lerRegiaoPendente } = await import('../../../features/ativacao/regiaoPendente');
    guardarRegiaoPendente('mooca');
    const onContinuar = vi.fn().mockResolvedValue(true);
    render(<TelaEscolher subprefeituras={subs} localizar={vi.fn()} onContinuar={onContinuar} />);
    expect(screen.getByRole('checkbox', { name: 'Mooca' })).toBeChecked();
    expect(onContinuar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar · 1' }));
    await waitFor(() => expect(onContinuar).toHaveBeenCalledWith(['s1']));
    await waitFor(() => expect(lerRegiaoPendente()).toBeNull());
  });
});

describe('TelaEscolher com região pendente e lista que chega depois', () => {
  it('marca quando as subprefeituras chegam', async () => {
    localStorage.clear();
    const { guardarRegiaoPendente } = await import('../../../features/ativacao/regiaoPendente');
    guardarRegiaoPendente('penha');
    const { rerender } = render(<TelaEscolher subprefeituras={[]} localizar={vi.fn()} onContinuar={vi.fn()} />);
    rerender(<TelaEscolher subprefeituras={subs} localizar={vi.fn()} onContinuar={vi.fn()} />);
    expect(screen.getByRole('checkbox', { name: 'Penha' })).toBeChecked();
  });
});

// D4 (escolha do user, 18/11/2026): com mais de uma cidade, escolhe-se a cidade primeiro ("melhor
// para evoluir para outros estados e cidades"); a seleção vale entre as cidades.
describe('TelaEscolher com duas cidades', () => {
  // Outro teste deixa uma região pendente gravada; aqui a pessoa chega sem região.
  beforeEach(() => localStorage.clear());
  const duas = [
    { id: 's1', nome: 'Mooca', zona: 'Leste', cidade: 'São Paulo', faixaRisco: 'BAIXO' as const },
    { id: 's2', nome: 'Penha', zona: 'Leste', cidade: 'São Paulo', faixaRisco: 'BAIXO' as const },
    { id: 'b1', nome: 'Santos', zona: 'Baixada Santista', cidade: 'Baixada Santista', faixaRisco: 'BAIXO' as const },
    { id: 'b2', nome: 'Guarujá', zona: 'Baixada Santista', cidade: 'Baixada Santista', faixaRisco: 'BAIXO' as const },
  ];

  it('primeiro a cidade; depois só as áreas dela, e dá para trocar', () => {
    render(<TelaEscolher subprefeituras={duas} localizar={vi.fn()} onContinuar={vi.fn()} />);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /São Paulo.*2 subprefeituras/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Baixada Santista.*2 municípios/ }));
    expect(screen.getAllByRole('checkbox').map((c) => c.getAttribute('aria-label'))).toEqual(['Guarujá', 'Santos']);
    expect(screen.getByRole('searchbox', { name: 'Buscar município' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Trocar cidade' }));
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  // E4b: o foco acompanha a troca de tela (teclado e leitor de tela não ficam no vazio).
  it('a pergunta é título, e o foco vai para a cidade escolhida e volta aos cartões', () => {
    render(<TelaEscolher subprefeituras={duas} localizar={vi.fn()} onContinuar={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Em qual cidade?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Baixada Santista/ }));
    expect(document.activeElement).toHaveTextContent('Baixada Santista');
    fireEvent.click(screen.getByRole('button', { name: 'Trocar cidade' }));
    expect(document.activeElement).toBe(screen.getAllByRole('button', { name: /subprefeituras|municípios/ })[0]);
  });

  it('a seleção vale entre as cidades', async () => {
    const onContinuar = vi.fn().mockResolvedValue(true);
    render(<TelaEscolher subprefeituras={duas} localizar={vi.fn()} onContinuar={onContinuar} />);
    fireEvent.click(screen.getByRole('button', { name: /Baixada Santista/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Santos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Trocar cidade' }));
    fireEvent.click(screen.getByRole('button', { name: /São Paulo/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mooca' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar · 2' }));
    await waitFor(() => expect(onContinuar).toHaveBeenCalledWith(['b1', 's1']));
  });

  it('a localização escolhe a cidade junto com a área', async () => {
    render(<TelaEscolher subprefeituras={duas} localizar={vi.fn().mockResolvedValue('b2')} onContinuar={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Usar minha localização/ }));
    expect(await screen.findByRole('checkbox', { name: 'Guarujá' })).toBeChecked();
    expect(screen.queryByRole('checkbox', { name: 'Mooca' })).not.toBeInTheDocument();
  });
});

// Achado da revisão: com a lista ainda chegando (ou com erro), a conta comum via "Em qual cidade?"
// sem nenhum cartão.
describe('TelaEscolher sem a lista ainda', () => {
  it('não pergunta a cidade antes de saber quais existem', () => {
    render(<TelaEscolher subprefeituras={[]} localizar={vi.fn()} onContinuar={vi.fn()} />);
    expect(screen.queryByText('Em qual cidade?')).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });
});
