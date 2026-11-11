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

  describe('chuva medida pelo CGE (AS7)', () => {
    const medida = { mm15: 2.4, mm60: 12.4, acumuladoPeriodoMm: 30, posto: 'Lapa', vizinho: false, coletadoEm: '2026-11-11T03:45:00Z' };
    const com = (m: Partial<typeof medida> | { mm15: null; mm60: number | null }) =>
      renderiza({ area: { ...itaquera, chuvaMedida: { ...medida, ...m } } as Area });

    it('mostra a chuva medida e a fonte quando há posto próprio; o bloco do modelo se chama estimada', () => {
      com({});
      expect(screen.getByText('Chuva medida')).toBeInTheDocument();
      expect(screen.getByText('2,4 mm em 15 min · 12,4 mm em 1 h')).toBeInTheDocument();
      expect(screen.getByText('CGE · posto Lapa')).toBeInTheDocument();
      expect(screen.getByText('Chuva estimada')).toBeInTheDocument();
    });

    it('diz que a medição é de perto quando o posto é de outra região', () => {
      com({ vizinho: true });
      expect(screen.getByText('Chuva medida perto')).toBeInTheDocument();
      expect(screen.getByText('CGE · posto Lapa')).toBeInTheDocument();
    });

    it('sem chuva medida, só o bloco estimado com o número do modelo', () => {
      renderiza();
      expect(screen.queryByText(/Chuva medida/)).not.toBeInTheDocument();
      expect(screen.getByText('Chuva estimada')).toBeInTheDocument();
      expect(screen.getByText('22,0')).toBeInTheDocument();
    });

    it('posto que marca zero vira uma frase, não um número', () => {
      com({ mm15: 0, mm60: 0 });
      expect(screen.getByText('Sem chuva na última hora')).toBeInTheDocument();
      expect(screen.queryByText(/0,0 mm em 15 min/)).not.toBeInTheDocument();
    });

    it('sem a leitura de uma hora atrás, fala só dos 15 minutos', () => {
      com({ mm60: null as unknown as number });
      expect(screen.getByText('2,4 mm em 15 min')).toBeInTheDocument();
    });

    it('sem janela nenhuma não mostra o bloco nem "null mm"', () => {
      com({ mm15: null, mm60: null });
      expect(screen.queryByText(/Chuva medida/)).not.toBeInTheDocument();
      expect(screen.queryByText(/null/)).not.toBeInTheDocument();
    });
  });
});
