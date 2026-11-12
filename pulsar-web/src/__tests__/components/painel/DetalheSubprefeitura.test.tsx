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

  it('favoritar, voltar e histórico', () => {
    const onToggleFavorito = vi.fn();
    const onFechar = vi.fn();
    renderiza({ onToggleFavorito, onFechar });
    fireEvent.click(screen.getByRole('button', { name: /favorit/i }));
    expect(onToggleFavorito).toHaveBeenCalledWith('s1');
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(onFechar).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Histórico/ }));
    expect(navigate).toHaveBeenCalledWith('/app/historico/itaquera', { state: { subNome: 'Itaquera', zona: 'Leste' } });
  });

  it('alerta desligado leva à ativação', () => {
    push.estado = 'inativo';
    renderiza();
    fireEvent.click(screen.getByRole('button', { name: /Ativar alertas/ }));
    expect(navigate).toHaveBeenCalledWith('/app/boas-vindas');
    push.estado = 'ativo';
  });

  it('risco com o porquê; blocos pelo nome da medida, sem repetir dado', () => {
    renderiza();
    expect(screen.getByText('Por chuva: 22,0 mm nas últimas 3h')).toBeInTheDocument();
    // A chuva não se chama "Alagamento": isso leria como rua alagada.
    expect(screen.getByText('Chuva estimada')).toBeInTheDocument();
    expect(screen.queryByText(/^Alagamento$/)).not.toBeInTheDocument();
    // Vento aparece uma vez só (antes saía no perigo e de novo nas condições).
    expect(screen.getAllByText('10')).toHaveLength(1);
  });

  it('não fala em região', () => {
    const { container } = renderiza();
    expect(container.textContent).not.toMatch(/regi(ão|ões)/i);
  });

  it('ação principal (alertas) vem primeiro, na linha inteira; histórico e compartilhar embaixo', () => {
    push.estado = 'inativo';
    renderiza();
    const ativar = screen.getByRole('button', { name: /Ativar alertas/ });
    const historico = screen.getByRole('button', { name: /Histórico/ });
    expect(ativar.compareDocumentPosition(historico) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(ativar.className).toContain('col-span-2');
    push.estado = 'ativo';
    renderiza();
    expect(screen.getAllByText('Alertas ligados')[0].className).toContain('col-span-2');
  });
});


describe('DetalheSubprefeitura: como chegar', () => {
  it('o botão Como chegar chama onComoChegar', () => {
    const onComoChegar = vi.fn();
    renderiza({ onComoChegar });
    fireEvent.click(screen.getByRole('button', { name: /Como chegar/ }));
    expect(onComoChegar).toHaveBeenCalled();
  });

  it('sem onComoChegar o botão não existe', () => {
    renderiza();
    expect(screen.queryByRole('button', { name: /Como chegar/ })).not.toBeInTheDocument();
  });
});

describe('DetalheSubprefeitura: chuva medida (AS7), uma frase na tela e os dados no toque', () => {
  const medida = { fonte: 'cge', mm15: 2.4, mm60: 12.4, acumuladoPeriodoMm: 30, posto: 'Lapa', vizinho: false, coletadoEm: '2026-11-11T03:45:00Z' };
  const dia = { mm: 12, estacao: 'Vila Leopoldina', medidoEm: '2026-11-11T03:40:00Z' };
  const com = (m: object = {}, chuva24h: typeof dia | null = null) =>
    renderiza({ area: { ...itaquera, chuvaMedida: { ...medida, ...m }, chuva24h } as Area });
  const abrir = () => fireEvent.click(screen.getByRole('button', { name: /medido/ }));

  it('na tela só a frase e "medido"; posto e horário ficam para o toque', () => {
    com();
    expect(screen.getByText('Chove agora: 2,4 mm em 15 min')).toBeInTheDocument();
    expect(screen.queryByText(/posto Lapa/)).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Chuva estimada')).toBeInTheDocument();
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
    expect(screen.queryByText(/0,0 mm em 15 min/)).not.toBeInTheDocument();
  });

  it('CGE sem dado: fala o CEMADEN, pela última hora e nunca em 15 minutos', () => {
    com({ fonte: 'cemaden', mm15: null, mm60: 5.8, acumuladoPeriodoMm: null, posto: 'Vila Leopoldina' });
    expect(screen.getByText('Choveu 5,8 mm na última hora')).toBeInTheDocument();
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

  it('sem chuva medida, só o bloco estimado com o número do modelo', () => {
    renderiza();
    expect(screen.queryByText(/medido/)).not.toBeInTheDocument();
    expect(screen.getByText('Chuva estimada')).toBeInTheDocument();
    expect(screen.getByText('22,0')).toBeInTheDocument();
  });

  it('sem janela nenhuma não mostra a linha nem "null mm"', () => {
    com({ mm15: null, mm60: null });
    expect(screen.queryByText(/medido/)).not.toBeInTheDocument();
    expect(screen.queryByText(/null/)).not.toBeInTheDocument();
  });
});
