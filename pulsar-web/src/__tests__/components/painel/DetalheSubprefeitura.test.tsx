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
    expect(navigate).toHaveBeenCalledWith('/app/historico/s1', { state: { subNome: 'Itaquera', zona: 'Leste' } });
  });

  it('alerta desligado leva à ativação', () => {
    push.estado = 'inativo';
    renderiza();
    fireEvent.click(screen.getByRole('button', { name: /Ativar alertas/ }));
    expect(navigate).toHaveBeenCalledWith('/app/boas-vindas');
    push.estado = 'ativo';
  });

  it('não fala em região', () => {
    const { container } = renderiza();
    expect(container.textContent).not.toMatch(/regi(ão|ões)/i);
  });
});
