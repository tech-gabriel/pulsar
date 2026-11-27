import { render, screen, fireEvent, within, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RiscoAgoraPublico } from '../../types';

const estado = vi.hoisted(() => ({
  risco: { dados: null as RiscoAgoraPublico[] | null, erro: false, carregando: false, atualizar: () => {} },
  mapaQuebra: false,
  usuario: null as object | null,
  falhaJson: '' as string, // trecho da URL que deve falhar
  semDados: '' as string, // trecho da URL que fica carregando
}));

vi.mock('../../hooks/useSeoHead', () => ({ useSeoHead: () => {} }));
vi.mock('../../hooks/useRiscoAgora', () => ({ useRiscoAgora: () => estado.risco }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ usuario: estado.usuario }) }));
vi.mock('../../features/alagamentosHoje/MapaPerto', () => ({
  default: (p: { pontos: unknown[]; centro?: unknown }) => {
    if (estado.mapaQuebra) throw new Error('chunk do mapa não baixou');
    return <div data-testid="mapa-perto" data-pontos={p.pontos.length} data-voce={p.centro ? 'sim' : 'nao'} />;
  },
}));

const PUBLICO = join(__dirname, '../../../public');
const leve = JSON.parse(readFileSync(join(PUBLICO, 'subprefeituras-leve.geojson'), 'utf8'));
const pontos = JSON.parse(readFileSync(join(PUBLICO, 'pontos-alagamento.json'), 'utf8'));
const leveBaixada = JSON.parse(readFileSync(join(PUBLICO, 'baixada-santista-leve.geojson'), 'utf8'));
const ARQUIVOS: [string, unknown][] = [
  ['baixada-santista-leve', leveBaixada], ['subprefeituras-leve', leve], ['pontos-alagamento', pontos],
];
vi.mock('../../hooks/useJsonPublico', () => ({
  useJsonPublico: (url: string, ativo: boolean) => {
    if (!ativo || (estado.semDados && url.includes(estado.semDados))) return { dados: null, erro: false };
    if (estado.falhaJson && url.includes(estado.falhaJson)) return { dados: null, erro: true };
    return { dados: ARQUIVOS.find(([nome]) => url.includes(nome))![1], erro: false };
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
    estado.risco = { dados: [mooca()], erro: false, carregando: false, atualizar: () => {} };
    estado.mapaQuebra = false;
    estado.usuario = null;
    estado.falhaJson = '';
    estado.semDados = '';
  });

  it('sem escolha: título, escolha da região, ranking e nenhuma faixa de risco', () => {
    abrir();
    expect(screen.getByRole('heading', { level: 1, name: 'Pontos de alagamento hoje em SP e na Baixada' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver a minha região/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/bairro/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Onde mais alagou em SP' })).toBeInTheDocument();
    expect(screen.queryByText(/Tranquilo|Atenção|Alerta/)).not.toBeInTheDocument();
  });

  it('a busca e os atalhos de região falam das duas cidades', () => {
    abrir();
    expect(screen.getByLabelText('Bairro ou cidade')).toHaveAttribute('placeholder', 'Ou digite o bairro ou a cidade');
    expect(screen.getByText(/só para achar a sua região\./)).toBeInTheDocument();
    const regioes = within(screen.getByRole('navigation', { name: 'Risco de alagamento por região' }));
    expect(regioes.getByRole('link', { name: 'Baixada Santista' })).toHaveAttribute('href', '/baixada-santista');
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
    estado.risco = { dados: null, erro: true, carregando: false, atualizar: vi.fn() };
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
    expect(await screen.findByText(/localização está bloqueada/)).toBeInTheDocument();
    expect(screen.getByLabelText(/bairro/i)).toBeInTheDocument();
  });

  it('localização em Guarulhos: fora das duas cidades', async () => {
    geolocalizacao((ok) => ok({ coords: { latitude: -23.4628, longitude: -46.5333, accuracy: 30 } } as GeolocationPosition));
    abrir();
    fireEvent.click(screen.getByRole('button', { name: /Ver a minha região/ }));
    expect(await screen.findByText('Esse lugar fica fora das cidades que o Pulsar cobre. Escolha um bairro de São Paulo ou uma cidade da Baixada Santista.')).toBeInTheDocument();
  });

  it('fora das duas cidades mostra o aviso novo', async () => {
    geolocalizacao((ok) => ok({ coords: { latitude: -22.9, longitude: -43.2, accuracy: 30 } } as GeolocationPosition));
    abrir();
    fireEvent.click(screen.getByRole('button', { name: /Ver a minha região/ }));
    expect(await screen.findByText(/fora das cidades que o Pulsar cobre/)).toBeInTheDocument();
  });

  it('localização em Santos escolhe Santos', async () => {
    geolocalizacao((ok) => ok({ coords: { latitude: -23.96, longitude: -46.33, accuracy: 30 } } as GeolocationPosition));
    abrir();
    fireEvent.click(screen.getByRole('button', { name: /Ver a minha região/ }));
    expect(await screen.findByRole('heading', { name: '7 pontos onde já alagou em Santos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Santos/ })).toBeInTheDocument();
  });

  it('localização em Santos: a cidade inteira no mapa, com Você e o raio de 2 km', async () => {
    geolocalizacao((ok) => ok({ coords: { latitude: -23.9667, longitude: -46.3334, accuracy: 30 } } as GeolocationPosition));
    abrir();
    fireEvent.click(screen.getByRole('button', { name: /Ver a minha região/ }));
    expect(await screen.findByRole('heading', { name: '7 pontos onde já alagou em Santos' })).toBeInTheDocument();
    const mapa = await screen.findByTestId('mapa-perto');
    expect(mapa).toHaveAttribute('data-pontos', '7');
    expect(mapa).toHaveAttribute('data-voce', 'sim');
    expect(screen.getByText('Ponto onde já alagou')).toBeInTheDocument();
    expect(screen.getByText('Você')).toBeInTheDocument();
    expect(screen.getByText('2 km')).toBeInTheDocument();
  });

  it('localização em Bertioga: frase de zero pontos, legenda só com Você e 2 km', async () => {
    geolocalizacao((ok) => ok({ coords: { latitude: -23.8486, longitude: -46.1389, accuracy: 30 } } as GeolocationPosition));
    abrir();
    fireEvent.click(screen.getByRole('button', { name: /Ver a minha região/ }));
    expect(await screen.findByRole('heading', { name: 'Ainda não marcamos nenhum ponto onde já alagou em Bertioga' })).toBeInTheDocument();
    expect(screen.getByText('Você')).toBeInTheDocument();
    expect(screen.getByText('2 km')).toBeInTheDocument();
    expect(screen.queryByText('Ponto onde já alagou')).not.toBeInTheDocument();
  });

  it('os pinos da Baixada vêm do snapshot: o mapa não espera fetch nenhum', () => {
    estado.falhaJson = 'pontos';
    abrir();
    escolherBairro('Santos');
    expect(screen.getByRole('heading', { name: '7 pontos onde já alagou em Santos' })).toBeInTheDocument();
    expect(screen.getByTestId('mapa-perto')).toHaveAttribute('data-pontos', '7');
  });

  it('Santos pela busca segue sem Você', () => {
    abrir();
    escolherBairro('Santos');
    expect(screen.getByTestId('mapa-perto')).toHaveAttribute('data-voce', 'nao');
    expect(screen.queryByText('Você')).not.toBeInTheDocument();
    expect(screen.queryByText('2 km')).not.toBeInTheDocument();
  });

  it('busca "guaruja" escolhe Guarujá, com os pontos do snapshot e a legenda de um item', () => {
    abrir();
    escolherBairro('guaruja');
    expect(screen.getByRole('heading', { name: '2 pontos onde já alagou no Guarujá' })).toBeInTheDocument();
    expect(screen.getByText('Marcados a partir de notícias da região. Mostram onde costuma alagar, não o que está alagado agora.')).toBeInTheDocument();
    expect(screen.getByText('Ponto onde já alagou')).toBeInTheDocument();
    expect(screen.queryByText('Inundação')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Criar conta grátis' })).toHaveAttribute('href', '/cadastro?regiao=guaruja');
  });

  it('município com um ponto só fala no singular', () => {
    abrir();
    escolherBairro('Cubatão');
    expect(screen.getByRole('heading', { name: '1 ponto onde já alagou em Cubatão' })).toBeInTheDocument();
  });

  it('município sem ponto marcado: frase honesta, mapa com o contorno e sem legenda', () => {
    abrir();
    escolherBairro('Bertioga');
    expect(screen.getByRole('heading', { name: 'Ainda não marcamos nenhum ponto onde já alagou em Bertioga' })).toBeInTheDocument();
    expect(screen.getByTestId('mapa-perto')).toBeInTheDocument();
    expect(screen.queryByText('Ponto onde já alagou')).not.toBeInTheDocument();
  });

  it('Baixada sem risco agora não vira Tranquilo', () => {
    abrir();
    escolherBairro('Santos');
    expect(screen.getByText(/Sem leitura agora em Santos/)).toBeInTheDocument();
    expect(screen.queryByText('Tranquilo')).not.toBeInTheDocument();
  });

  it('Baixada com risco na resposta mostra a faixa pelo nome', () => {
    estado.risco = { dados: [mooca({ nome: 'Santos' })], erro: false, carregando: false, atualizar: () => {} };
    abrir();
    escolherBairro('Santos');
    expect(within(screen.getByRole('region', { name: /Risco agora em Santos/ })).getByText('Atenção')).toBeInTheDocument();
  });

  it('Baixada não mostra o bloco do CGE nem os alagamentos do GeoSampa', () => {
    estado.risco = { dados: [mooca({ nome: 'Santos', alagamentosCge: [{ via: 'Av. Ana Costa', referencia: 'Gonzaga', inicioUtc: '2026-11-02T18:52:00Z', transitavel: false }] })], erro: false, carregando: false, atualizar: () => {} };
    abrir();
    escolherBairro('Santos');
    expect(screen.queryByText('Alagando agora')).not.toBeInTheDocument();
    expect(screen.queryByText(/alagamentos? registrados?/)).not.toBeInTheDocument();
  });

  it('localização na Mooca: conta os alagamentos a até 2 km de você', async () => {
    geolocalizacao((ok) => ok({ coords: { latitude: -23.5489, longitude: -46.6001, accuracy: 30 } } as GeolocationPosition));
    abrir();
    fireEvent.click(screen.getByRole('button', { name: /Ver a minha região/ }));
    await waitFor(() => expect(screen.getByRole('region', { name: /Risco agora na Mooca/ })).toBeInTheDocument());
    expect(screen.getByText(/a até 2 km de você/)).toBeInTheDocument();
    expect(screen.getByTestId('mapa-perto')).toHaveAttribute('data-voce', 'sim');
    expect(screen.getByText('Você')).toBeInTheDocument();
    expect(screen.getByText('2 km')).toBeInTheDocument();
    expect(screen.getByText('Alagamento')).toBeInTheDocument();
  });

  it('logado: o convite leva ao mapa da região', () => {
    estado.usuario = { id: 'u1' };
    abrir();
    escolherBairro('Mooca');
    expect(screen.getByRole('link', { name: 'Ver a Mooca no mapa' })).toHaveAttribute('href', '/app?regiao=mooca');
  });

  it('alagamento ativo do CGE aparece com a rua; sem ponto, o card não aparece', () => {
    estado.risco = { dados: [mooca({ alagamentosCge: [{ via: 'Av. do Estado', referencia: 'Viaduto Glicério', inicioUtc: '2026-11-02T18:52:00Z', transitavel: false }] })], erro: false, carregando: false, atualizar: () => {} };
    const { unmount } = abrir();
    escolherBairro('Mooca');
    const card = screen.getByRole('region', { name: 'Alagando agora' });
    expect(within(card).getByText('Av. do Estado')).toBeInTheDocument();
    unmount();
    estado.risco = { dados: [mooca()], erro: false, carregando: false, atualizar: () => {} };
    estado.mapaQuebra = false;
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
    estado.risco = { dados: [mooca({ score: null, atualizadoEmUtc: null, faixaRisco: 'BAIXO' })], erro: false, carregando: false, atualizar: () => {} };
    abrir();
    escolherBairro('Mooca');
    expect(screen.getByText(/Sem leitura agora/)).toBeInTheDocument();
    expect(screen.queryByText('Tranquilo')).not.toBeInTheDocument();
  });

  it('localização sem sinal ou que demora: diz que não achou e convida a tentar de novo, não que está bloqueada', async () => {
    geolocalizacao((_ok, erro) => erro({ code: 3 } as GeolocationPositionError));
    abrir();
    fireEvent.click(screen.getByRole('button', { name: /Ver a minha região/ }));
    expect(await screen.findByText(/Não deu para achar a sua localização agora/)).toBeInTheDocument();
    expect(screen.queryByText(/bloqueada/)).not.toBeInTheDocument();
  });

  it('pedido de localização ignorado: sai do Procurando depois da espera', () => {
    vi.useFakeTimers();
    try {
      geolocalizacao(() => {}); // o navegador nunca responde
      abrir();
      fireEvent.click(screen.getByRole('button', { name: /Ver a minha região/ }));
      expect(screen.getByRole('button', { name: /Procurando você/ })).toBeDisabled();
      act(() => vi.advanceTimersByTime(20_000));
      expect(screen.getByText(/A localização não respondeu/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Ver a minha região/ })).toBeEnabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('localização que chega depois de escolher o bairro não troca a região nem mostra aviso', () => {
    let responder: { ok: PositionCallback; erro: PositionErrorCallback } | null = null;
    geolocalizacao((ok, erro) => { responder = { ok, erro }; });
    abrir();
    fireEvent.click(screen.getByRole('button', { name: /Ver a minha região/ }));
    escolherBairro('Mooca');
    act(() => responder!.ok({ coords: { latitude: -23.5329, longitude: -46.7396, accuracy: 30 } } as GeolocationPosition)); // Butantã
    expect(screen.getByRole('button', { name: /Mooca/ })).toBeInTheDocument();
    act(() => responder!.erro({ code: 1 } as GeolocationPositionError));
    fireEvent.click(screen.getByRole('button', { name: /trocar a região/ }));
    expect(screen.queryByText(/bloqueada/)).not.toBeInTheDocument();
  });

  it('leitura de outro dia mostra a data, não só a hora', () => {
    abrir();
    escolherBairro('Mooca');
    expect(screen.getByText(/^Atualizado em /)).toBeInTheDocument();
  });

  it('tentar de novo em andamento: o botão avisa e não aceita clique duplo', () => {
    estado.risco = { dados: null, erro: true, carregando: true, atualizar: vi.fn() };
    abrir();
    escolherBairro('Mooca');
    expect(screen.getByRole('button', { name: 'Tentando…' })).toBeDisabled();
  });

  it('mapa que não abre não derruba a página', () => {
    estado.mapaQuebra = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    abrir();
    escolherBairro('Mooca');
    expect(screen.getByText(/Não deu para abrir o mapa agora/)).toBeInTheDocument();
    expect(screen.getByText(/Risco agora na Mooca/)).toBeInTheDocument();
  });
});
