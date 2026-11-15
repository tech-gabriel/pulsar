import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (orig) => ({ ...(await orig<typeof import('react-router-dom')>()), useNavigate: () => navigate }));
const push = vi.hoisted(() => ({ estado: 'ativo' }));
vi.mock('../../../hooks/useNotificacoesPrefs', () => ({ useNotificacoesPrefs: () => ({ prefs: {} }) }));
vi.mock('../../../hooks/usePushSubscription', () => ({ usePushSubscription: () => push }));
vi.mock('../../../hooks/useCatalogoDicas', () => ({ useCatalogoDicas: () => [] }));
vi.mock('../../../features/compartilhar/BotaoCompartilhar', () => ({ default: () => null }));
vi.mock('../../../hooks/usePrevisaoSubprefeitura', () => ({ usePrevisaoSubprefeitura: () => ({ faixas: [], carregando: false, erro: null }) }));

import DetalheSubprefeitura from '../../../components/painel/DetalheSubprefeitura';
import type { Area } from '../../../features/cidade/areas';

const itaquera = {
  id: 's1', nome: 'Itaquera', zona: 'Leste', latitude: 0, longitude: 0, temperaturaAtual: 24, faixaRisco: 'ALTO',
  scoreAtual: { valor: 78, faixa: 'ALTO', timestamp: '', perigoPrincipal: 'ALAGAMENTO', chuva3hMm: 22 },
  ultimaLeitura: { chuvaMmH: 6, ventoKmH: 10, visibilidadeKm: 8, indiceUv: 1, temperaturaC: 24, sensacaoTermica: 26, umidade: 90, timestamp: '' },
} as Area;

const renderiza = (o: Partial<Parameters<typeof DetalheSubprefeitura>[0]> = {}) =>
  render(<MemoryRouter><DetalheSubprefeitura area={itaquera} isFavorito={() => false} onToggleFavorito={vi.fn()} onFechar={vi.fn()} {...o} /></MemoryRouter>);

describe('DetalheSubprefeitura', () => {
  it('nome com a zona como legenda e o risco', () => {
    renderiza();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Itaquera');
    expect(screen.getByText('Zona Leste · São Paulo')).toBeInTheDocument();
    expect(screen.getByText('Alerta')).toBeInTheDocument();
  });

  it('favoritar e fechar; o histórico saiu do detalhe', () => {
    const onToggleFavorito = vi.fn();
    const onFechar = vi.fn();
    renderiza({ onToggleFavorito, onFechar });
    fireEvent.click(screen.getByRole('button', { name: /favorit/i }));
    expect(onToggleFavorito).toHaveBeenCalledWith('s1');
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onFechar).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Histórico/ })).not.toBeInTheDocument();
  });

  it('aviso desligado leva à ativação; ligado vira estado, não botão', () => {
    push.estado = 'inativo';
    const { unmount } = renderiza();
    fireEvent.click(screen.getByRole('button', { name: 'Avisar' }));
    expect(navigate).toHaveBeenCalledWith('/app/boas-vindas');
    unmount();
    push.estado = 'ativo';
    const { container } = renderiza();
    expect(screen.queryByRole('button', { name: 'Avisar' })).not.toBeInTheDocument();
    expect(container.querySelector('.det-acao.ligado')).toHaveTextContent(/Avisos\s*ligados/i);
  });

  it('risco com o porquê; seções Chuva e Tempo agora, sem repetir dado', () => {
    renderiza();
    expect(screen.getByText('Por chuva: 22,0 mm nas últimas 3h')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Chuva' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Tempo agora' })).toBeInTheDocument();
    // A chuva não se chama "Alagamento": isso leria como rua alagada.
    expect(screen.queryByText(/^Alagamento$/)).not.toBeInTheDocument();
    // Vento aparece uma vez só.
    expect(screen.getAllByText('10')).toHaveLength(1);
  });

  it('não fala em região', () => {
    const { container } = renderiza();
    expect(container.textContent).not.toMatch(/regi(ão|ões)/i);
  });

  it('emergência com os dois telefones e o aviso de estimativa', () => {
    renderiza();
    expect(screen.getByRole('link', { name: /199.*Defesa Civil/ })).toHaveAttribute('href', 'tel:199');
    expect(screen.getByRole('link', { name: /193.*Bombeiros/ })).toHaveAttribute('href', 'tel:193');
    expect(screen.getByText('O risco é uma estimativa do Pulsar e não substitui os avisos oficiais.')).toBeInTheDocument();
  });

  it('área sem score nem leitura abre só com cabeçalho, traço e pé', () => {
    renderiza({ area: { ...itaquera, scoreAtual: null, ultimaLeitura: null } as unknown as Area });
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Itaquera');
    expect(screen.getByText('–')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
  });
});

describe('DetalheSubprefeitura: folha do celular', () => {
  it('sem folha (computador) fica aberto e sem alça', () => {
    const { container } = renderiza();
    expect(container.querySelector('.det')).toHaveAttribute('data-estado', 'aberta');
    expect(screen.queryByRole('button', { name: /Mostrar/ })).not.toBeInTheDocument();
  });

  it('curta: o toque na alça pede para abrir', () => {
    const onMudar = vi.fn();
    const { container } = renderiza({ folha: { aberta: false, onMudar } });
    expect(container.querySelector('.det')).toHaveAttribute('data-estado', 'curta');
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar mais detalhes' }));
    expect(onMudar).toHaveBeenCalledWith(true);
  });

  it('aberta: o toque na alça pede para recolher', () => {
    const onMudar = vi.fn();
    renderiza({ folha: { aberta: true, onMudar } });
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar menos' }));
    expect(onMudar).toHaveBeenCalledWith(false);
  });
});

describe('DetalheSubprefeitura: rota até aqui', () => {
  it('o botão chama onComoChegar', () => {
    const onComoChegar = vi.fn();
    renderiza({ onComoChegar });
    fireEvent.click(screen.getByRole('button', { name: 'Rota até aqui' }));
    expect(onComoChegar).toHaveBeenCalled();
  });

  it('sem onComoChegar o botão não existe', () => {
    renderiza();
    expect(screen.queryByRole('button', { name: 'Rota até aqui' })).not.toBeInTheDocument();
  });
});

describe('DetalheSubprefeitura: chuva medida, a faixa "Medida agora" e os dados no toque', () => {
  const medida = { fonte: 'cge', mm15: 2.4, mm60: 12.4, acumuladoPeriodoMm: 30, posto: 'Lapa', vizinho: false, coletadoEm: '2026-11-11T03:45:00Z' };
  const dia = { mm: 12, estacao: 'Vila Leopoldina', medidoEm: '2026-11-11T03:40:00Z' };
  const com = (m: object = {}, chuva24h: typeof dia | null = null) =>
    renderiza({ area: { ...itaquera, chuvaMedida: { ...medida, ...m }, chuva24h } as Area });
  const abrir = () => fireEvent.click(screen.getByRole('button', { name: /posto|estação/ }));
  const AVISO_ESTIMADA = 'Não há estação com leitura perto daqui agora. O risco usa a chuva estimada.';

  it('medida com o posto e os números; a estimada continua, sem o aviso', () => {
    com();
    expect(screen.getByText('Medida agora')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'posto Lapa do CGE' })).toBeInTheDocument();
    expect(screen.getByText('2,4')).toBeInTheDocument();
    expect(screen.getByText('nos últimos 15 min')).toBeInTheDocument();
    expect(screen.getByText('12,4')).toBeInTheDocument();
    expect(screen.getByText('Estimada pelo modelo')).toBeInTheDocument();
    expect(screen.queryByText(AVISO_ESTIMADA)).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('o toque abre a folha com cada medição, quem mediu e o crédito', () => {
    com({}, dia);
    abrir();
    const folha = screen.getByRole('dialog', { name: 'Chuva medida em Itaquera' });
    expect(folha).toHaveTextContent('Últimos 15 minutos2,4 mm');
    expect(folha).toHaveTextContent(/CGE-SP · posto Lapa · lido às \d\d:\d\d/);
    expect(folha).toHaveTextContent('Última hora12,4 mm');
    expect(folha).toHaveTextContent('Últimas 24 horas12,0 mm');
    expect(folha).toHaveTextContent(/CEMADEN · estação Vila Leopoldina · consultado às \d\d:\d\d/);
    expect(folha).toHaveTextContent('Dados do CGE da Prefeitura de São Paulo e da rede observacional do CEMADEN/MCTIC.');
  });

  it('sem as 24 horas do CEMADEN a folha não cita o CEMADEN', () => {
    com();
    abrir();
    const folha = screen.getByRole('dialog');
    expect(folha).not.toHaveTextContent('24 horas');
    expect(folha).not.toHaveTextContent('CEMADEN');
    expect(folha).toHaveTextContent('Dados do CGE da Prefeitura de São Paulo.');
  });

  it('posto de outra subprefeitura: a folha avisa que é o mais próximo', () => {
    com({ vizinho: true });
    abrir();
    expect(screen.getByRole('dialog')).toHaveTextContent('Medida no posto mais próximo');
  });

  it('posto que marca zero vira uma frase, não um número', () => {
    com({ mm15: 0, mm60: 0 });
    expect(screen.getByText('Sem chuva agora')).toBeInTheDocument();
    expect(screen.queryByText('nos últimos 15 min')).not.toBeInTheDocument();
  });

  it('CGE sem dado: fala o CEMADEN, pela última hora e nunca em 15 minutos', () => {
    com({ fonte: 'cemaden', mm15: null, mm60: 5.8, acumuladoPeriodoMm: null, posto: 'Vila Leopoldina' });
    expect(screen.getByRole('button', { name: 'estação Vila Leopoldina do CEMADEN' })).toBeInTheDocument();
    expect(screen.getByText('5,8')).toBeInTheDocument();
    expect(screen.getByText('na última hora')).toBeInTheDocument();
    expect(screen.queryByText('nos últimos 15 min')).not.toBeInTheDocument();
    abrir();
    const folha = screen.getByRole('dialog');
    expect(folha).not.toHaveTextContent('15 minutos');
    expect(folha).toHaveTextContent(/CEMADEN · estação Vila Leopoldina · consultado às \d\d:\d\d/);
    expect(folha).toHaveTextContent('Dados da rede observacional do CEMADEN/MCTIC.');
    expect(folha).not.toHaveTextContent('CGE');
  });

  it('CEMADEN marcando zero na última hora', () => {
    com({ fonte: 'cemaden', mm15: null, mm60: 0 });
    expect(screen.getByText('Sem chuva na última hora')).toBeInTheDocument();
  });

  it('sem chuva medida, a estimada fala sozinha e avisa', () => {
    renderiza();
    expect(screen.queryByText('Medida agora')).not.toBeInTheDocument();
    expect(screen.getByText('Estimada pelo modelo')).toBeInTheDocument();
    expect(screen.getByText('22,0')).toBeInTheDocument();
    expect(screen.getByText(AVISO_ESTIMADA)).toBeInTheDocument();
  });

  it('sem janela nenhuma não mostra a faixa nem "null mm"', () => {
    com({ mm15: null, mm60: null });
    expect(screen.queryByText('Medida agora')).not.toBeInTheDocument();
    expect(screen.queryByText(/null/)).not.toBeInTheDocument();
  });
});

describe('DetalheSubprefeitura: trecho', () => {
  const trecho = (o: object = {}) => ({
    h3: 'h1', areaId: 's1', valor: 34, faixa: 'MODERADO' as const, perigo: 'ALAGAMENTO' as const,
    alagamento: { valor: 34, faixa: 'MODERADO' as const }, estacao: null, origem: 'toque' as const, ...o,
  });

  it('o topo é do trecho, com de onde ele veio, e a área inteira vira uma linha', () => {
    renderiza({ trecho: trecho() });
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Itaquera');
    expect(screen.getByText('Trecho que você tocou · Zona Leste')).toBeInTheDocument();
    expect(screen.getByLabelText('Score 34 de 100')).toBeInTheDocument();
    expect(screen.getByText('Atenção')).toBeInTheDocument();
    expect(screen.getByText('Itaquera inteira em Alerta')).toBeInTheDocument();
  });

  it('localização e busca dizem de onde é o trecho', () => {
    const { unmount } = renderiza({ trecho: trecho({ origem: 'localizacao' }) });
    expect(screen.getByText('Trecho onde você está · Zona Leste')).toBeInTheDocument();
    unmount();
    renderiza({ trecho: trecho({ origem: 'busca' }) });
    expect(screen.getByText('Trecho do endereço buscado · Zona Leste')).toBeInTheDocument();
  });

  it('com estação perto, a frase é a leitura dela', () => {
    renderiza({ trecho: trecho({ estacao: { cod: 'E1', mm1h: 4.2, mm3h: 6, distanciaKm: 1.9 } }) });
    expect(screen.getByText('Estação a 1,9 km mediu 4,2 mm na última hora')).toBeInTheDocument();
  });

  it('sem estação, a frase do risco segue a faixa do trecho, não a da área', () => {
    renderiza({ area: { ...itaquera, faixaRisco: 'BAIXO' } as Area, trecho: trecho() });
    expect(screen.getByText('Por chuva: 22,0 mm nas últimas 3h')).toBeInTheDocument();
  });
});
