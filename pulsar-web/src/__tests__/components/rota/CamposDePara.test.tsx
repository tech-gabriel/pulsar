import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import type { SubprefeituraMapaDto } from '../../../types';

// O geocoder devolve o bairro "Mooca" junto com a rua: a subprefeitura já está na lista.
const PADRAO = [
  { nome: 'Mooca', descricao: 'Mooca, São Paulo', tipo: 'neighbourhood', latitude: -23.55, longitude: -46.6 },
  { nome: 'Rua da Mooca', descricao: 'Rua da Mooca, São Paulo', tipo: 'address', latitude: -23.55, longitude: -46.61 },
];
const busca = vi.hoisted(() => ({ resultados: [] as unknown[] }));
vi.mock('../../../hooks/useBuscaEndereco', () => ({
  useBuscaEndereco: () => ({ setTermo: vi.fn(), carregando: false, limpar: vi.fn(), resultados: busca.resultados }),
}));
beforeEach(() => { busca.resultados = PADRAO; });

import CamposDePara from '../../../components/rota/CamposDePara';

const areas = [{ id: 'mooca', nome: 'Mooca', latitude: -23.55, longitude: -46.6 }] as SubprefeituraMapaDto[];

const monta = (embutida: boolean) => {
  render(<CamposDePara areas={areas} origem={null} destino={null} onOrigem={vi.fn()} onDestino={vi.fn()}
    onInverter={vi.fn()} onFechar={vi.fn()} embutida={embutida} />);
  fireEvent.change(screen.getByLabelText('Para'), { target: { value: 'Mooca' } });
  return screen.getByRole('listbox');
};

describe('CamposDePara: sugestões', () => {
  it('não repete a subprefeitura que também veio como endereço', () => {
    monta(false);
    expect(screen.getAllByRole('option', { name: 'Mooca' })).toHaveLength(1);
    expect(screen.getByRole('option', { name: 'Rua da Mooca' })).toBeInTheDocument();
  });

  it('no painel a lista fica no fluxo e abaixo da cápsula inteira, fora da coluna dos campos', () => {
    const lista = monta(true);
    expect(lista).not.toHaveClass('absolute');
    expect(lista.closest('.mapa-controle')).toBeNull();
    expect(lista.closest('[data-campos-rota]')).not.toBeNull();
  });

  it('no painel escolher uma sugestão funciona (o clique na lista não conta como clique fora)', () => {
    const onDestino = vi.fn();
    render(<CamposDePara areas={areas} origem={null} destino={null} onOrigem={vi.fn()} onDestino={onDestino}
      onInverter={vi.fn()} onFechar={vi.fn()} embutida />);
    fireEvent.change(screen.getByLabelText('Para'), { target: { value: 'Mooca' } });
    const botao = screen.getByRole('option', { name: 'Rua da Mooca' });
    fireEvent.mouseDown(botao);
    fireEvent.click(botao);
    expect(onDestino).toHaveBeenCalledWith(expect.objectContaining({ rotulo: 'Rua da Mooca' }));
  });

  it('no celular a lista flutua sobre o mapa', () => {
    const lista = monta(false);
    expect(lista).toHaveClass('absolute');
    expect(lista.closest('.mapa-controle')).not.toBeNull();
  });
});

describe('CamposDePara: teclado nas sugestões', () => {
  const abre = (destino: { lat: number; lon: number; rotulo: string } | null = null) => {
    const onDestino = vi.fn();
    render(<CamposDePara areas={areas} origem={null} destino={destino} onOrigem={vi.fn()} onDestino={onDestino}
      onInverter={vi.fn()} onFechar={vi.fn()} />);
    const campo = screen.getByRole('combobox', { name: 'Para' });
    fireEvent.change(campo, { target: { value: 'Mooca' } });
    return { campo, onDestino };
  };

  it('lista e opções têm os papéis de listbox, e o campo aponta para ela', () => {
    const { campo } = abre();
    const lista = screen.getByRole('listbox');
    expect(campo).toHaveAttribute('aria-expanded', 'true');
    expect(campo).toHaveAttribute('aria-controls', lista.id);
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('setas andam pelas opções (com volta) e o campo marca a ativa', () => {
    const { campo } = abre();
    const [primeira, segunda] = screen.getAllByRole('option');
    fireEvent.keyDown(campo, { key: 'ArrowDown' });
    expect(campo).toHaveAttribute('aria-activedescendant', primeira.id);
    expect(primeira).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(campo, { key: 'ArrowDown' });
    expect(campo).toHaveAttribute('aria-activedescendant', segunda.id);
    fireEvent.keyDown(campo, { key: 'ArrowDown' });
    expect(campo).toHaveAttribute('aria-activedescendant', primeira.id);
    fireEvent.keyDown(campo, { key: 'ArrowUp' });
    expect(campo).toHaveAttribute('aria-activedescendant', segunda.id);
  });

  it('Enter escolhe a opção ativa', () => {
    const { campo, onDestino } = abre();
    fireEvent.keyDown(campo, { key: 'ArrowDown' });
    fireEvent.keyDown(campo, { key: 'ArrowDown' });
    fireEvent.keyDown(campo, { key: 'Enter' });
    expect(onDestino).toHaveBeenCalledWith(expect.objectContaining({ rotulo: 'Rua da Mooca' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('Enter sem opção ativa não escolhe nada', () => {
    const { campo, onDestino } = abre();
    fireEvent.keyDown(campo, { key: 'Enter' });
    expect(onDestino).not.toHaveBeenCalled();
  });

  it('Esc fecha a lista e devolve o texto do ponto escolhido', () => {
    const { campo, onDestino } = abre({ lat: -23.5, lon: -46.6, rotulo: 'Sé' });
    fireEvent.keyDown(campo, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(campo).toHaveValue('Sé');
    expect(campo).toHaveAttribute('aria-expanded', 'false');
    expect(onDestino).not.toHaveBeenCalled();
  });
});

describe('CamposDePara: lista que muda depois das setas', () => {
  it('resultados novos do geocoder desfazem a marca: o Enter não escolhe outra opção no lugar', () => {
    const onDestino = vi.fn();
    const props = { areas, origem: null, destino: null, onOrigem: vi.fn(), onDestino, onInverter: vi.fn(), onFechar: vi.fn() };
    const { rerender } = render(<CamposDePara {...props} />);
    const campo = screen.getByRole('combobox', { name: 'Para' });
    fireEvent.change(campo, { target: { value: 'Mooca' } });
    fireEvent.keyDown(campo, { key: 'ArrowDown' });
    fireEvent.keyDown(campo, { key: 'ArrowDown' });
    busca.resultados = [{ nome: 'Rua Nova', descricao: 'Rua Nova, São Paulo', tipo: 'address', latitude: -23.5, longitude: -46.6 }, ...PADRAO];
    rerender(<CamposDePara {...props} />);
    expect(campo).not.toHaveAttribute('aria-activedescendant');
    fireEvent.keyDown(campo, { key: 'Enter' });
    expect(onDestino).not.toHaveBeenCalled();
  });
});

describe('CamposDePara: indicadores', () => {
  it('De e Para usam os marcadores do mapa: o ponto azul e a bandeira de chegada', () => {
    const { container } = render(<CamposDePara areas={areas} origem={null} destino={null} onOrigem={vi.fn()} onDestino={vi.fn()}
      onInverter={vi.fn()} onFechar={vi.fn()} />);
    const origem = container.querySelector('[data-indicador="origem"]') as HTMLElement;
    const destino = container.querySelector('[data-indicador="destino"]') as HTMLElement;
    expect(origem.style.background).toBe('var(--color-pulsar-500)');
    expect(destino.style.background).toBe('var(--color-pulsar-600)');
    expect(destino.querySelector('.lucide-flag')).not.toBeNull();
  });
});

describe('CamposDePara: casa e trabalho', () => {
  const CASA = { tipo: 'CASA' as const, latitude: -23.56, longitude: -46.65, rotulo: 'Rua Augusta, 100', subprefeituraId: 's1', subprefeituraNome: 'Sé' };
  const monta = (extra: Partial<React.ComponentProps<typeof CamposDePara>> = {}) => {
    const props = {
      areas, origem: null, destino: { lat: -23.5, lon: -46.6, rotulo: 'Sé' }, onOrigem: vi.fn(), onDestino: vi.fn(),
      onInverter: vi.fn(), onFechar: vi.fn(), locais: {}, onSalvarLocal: vi.fn().mockResolvedValue(true), ...extra,
    };
    render(<CamposDePara {...props} />);
    return props;
  };

  const capsula = () => document.querySelector('[data-campos-rota] .mapa-controle') as HTMLElement;

  it('foco_semLocais_mostraCasaETrabalhoComToqueParaSalvar', () => {
    monta();
    fireEvent.focus(screen.getByRole('combobox', { name: 'Para' }));
    const casa = screen.getByRole('button', { name: 'Casa, toque para salvar' });
    const trabalho = screen.getByRole('button', { name: 'Trabalho, toque para salvar' });
    expect(casa).toHaveTextContent('Toque para salvar');
    expect(trabalho).toHaveTextContent('Toque para salvar');
    // Dentro da cápsula, fora do listbox.
    expect(casa.closest('.mapa-controle')).not.toBeNull();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it('linhasAbertas_capsulaGanhaVidroPainel_fechadasNao', () => {
    monta();
    expect(capsula()).not.toHaveClass('vidro-painel');
    const campo = screen.getByRole('combobox', { name: 'Para' });
    fireEvent.focus(campo);
    expect(capsula()).toHaveClass('vidro-painel');
    fireEvent.change(campo, { target: { value: 'a' } });
    expect(capsula()).not.toHaveClass('vidro-painel');
  });

  it('no painel as linhas aparecem sem vidro próprio', () => {
    monta({ embutida: true });
    fireEvent.focus(screen.getByRole('combobox', { name: 'Para' }));
    expect(screen.getByRole('button', { name: /^Casa/ })).toBeInTheDocument();
    expect(capsula()).not.toHaveClass('vidro-painel');
  });

  it('carregandoLocais_naoMostraAsLinhas', () => {
    monta({ locais: {}, carregandoLocais: true });
    fireEvent.focus(screen.getByRole('combobox', { name: 'Para' }));
    expect(screen.queryByRole('button', { name: /^Casa/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Toque para salvar')).not.toBeInTheDocument();
  });

  it('foco_comCasa_mostraEnderecoESomeAoDigitar', () => {
    monta({ locais: { CASA } });
    const campo = screen.getByRole('combobox', { name: 'Para' });
    fireEvent.focus(campo);
    expect(screen.getByRole('button', { name: 'Casa, Rua Augusta, 100' })).toHaveTextContent('Rua Augusta, 100');
    fireEvent.change(campo, { target: { value: 'a' } });
    expect(screen.queryByRole('button', { name: /^Casa/ })).not.toBeInTheDocument();
  });

  it('foco_noDeComMinhaLocalizacao_mostraAsLinhas', () => {
    monta({ origem: { lat: -23.5, lon: -46.6, rotulo: 'Minha localização' } });
    fireEvent.focus(screen.getByRole('combobox', { name: 'De' }));
    expect(screen.getByRole('button', { name: /^Casa/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Trabalho/ })).toBeInTheDocument();
  });

  it('Tab do campo para a linha não fecha as linhas, e sair delas fecha', () => {
    monta();
    const campo = screen.getByRole('combobox', { name: 'Para' });
    fireEvent.focus(campo);
    const casa = screen.getByRole('button', { name: /^Casa/ });
    fireEvent.blur(campo, { relatedTarget: casa });
    expect(screen.getByRole('button', { name: /^Casa/ })).toBeInTheDocument();
    fireEvent.blur(casa, { relatedTarget: screen.getByRole('button', { name: 'Inverter origem e destino' }) });
    expect(screen.queryByRole('button', { name: /^Casa/ })).not.toBeInTheDocument();
  });

  it('tocarCasaPreenchida_preencheOCampo', () => {
    const { onDestino } = monta({ locais: { CASA } });
    fireEvent.focus(screen.getByRole('combobox', { name: 'Para' }));
    fireEvent.click(screen.getByRole('button', { name: /^Casa/ }));
    expect(onDestino).toHaveBeenCalledWith({ lat: -23.56, lon: -46.65, rotulo: 'Rua Augusta, 100' });
    expect(screen.queryByRole('button', { name: /^Casa/ })).not.toBeInTheDocument();
  });

  it('tocarCasaVazia_buscaSoEnderecos_eSalva', async () => {
    const { onDestino, onSalvarLocal } = monta();
    const campo = screen.getByRole('combobox', { name: 'Para' });
    fireEvent.focus(campo);
    fireEvent.click(screen.getByRole('button', { name: /^Casa/ }));
    expect(campo).toHaveAttribute('placeholder', 'Busque o endereço da sua casa');
    fireEvent.change(campo, { target: { value: 'Mooca' } });
    // Só endereços: a subprefeitura Mooca não aparece (o bairro do geocoder, sim, é endereço).
    expect(screen.queryByRole('button', { name: /^Casa/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2);
    fireEvent.click(screen.getByRole('option', { name: 'Rua da Mooca' }));
    const esperado = { lat: -23.55, lon: -46.61, rotulo: 'Rua da Mooca', fonte: 'endereco' };
    expect(onSalvarLocal).toHaveBeenCalledWith('CASA', esperado);
    await waitFor(() => expect(onDestino).toHaveBeenCalledWith(esperado));
  });

  it('salvar que falha não preenche o campo', async () => {
    const { onDestino, onSalvarLocal } = monta({ onSalvarLocal: vi.fn().mockResolvedValue(false) });
    const campo = screen.getByRole('combobox', { name: 'Para' });
    fireEvent.focus(campo);
    fireEvent.click(screen.getByRole('button', { name: /^Trabalho/ }));
    expect(campo).toHaveAttribute('placeholder', 'Busque o endereço do seu trabalho');
    fireEvent.change(campo, { target: { value: 'Mooca' } });
    fireEvent.click(screen.getByRole('option', { name: 'Rua da Mooca' }));
    await waitFor(() => expect(onSalvarLocal).toHaveBeenCalled());
    expect(onDestino).not.toHaveBeenCalled();
  });

  it('Escape cancela o modo salvando', () => {
    monta();
    const campo = screen.getByRole('combobox', { name: 'Para' });
    fireEvent.focus(campo);
    fireEvent.click(screen.getByRole('button', { name: /^Casa/ }));
    fireEvent.keyDown(campo, { key: 'Escape' });
    expect(campo).toHaveAttribute('placeholder', 'Para onde você vai?');
    expect(campo).toHaveValue('Sé');
  });

  it('escolherEnderecoNormal_marcaFonteEndereco', () => {
    const { onDestino } = monta();
    fireEvent.change(screen.getByRole('combobox', { name: 'Para' }), { target: { value: 'Mooca' } });
    fireEvent.click(screen.getByRole('option', { name: 'Rua da Mooca' }));
    expect(onDestino).toHaveBeenCalledWith({ lat: -23.55, lon: -46.61, rotulo: 'Rua da Mooca', fonte: 'endereco' });
  });

  it('escolherSubprefeitura_semFonte', () => {
    const { onDestino } = monta();
    fireEvent.change(screen.getByRole('combobox', { name: 'Para' }), { target: { value: 'Mooca' } });
    fireEvent.click(screen.getByRole('option', { name: 'Mooca' }));
    expect(onDestino).toHaveBeenCalledWith({ lat: -23.55, lon: -46.6, rotulo: 'Mooca' });
  });
});
