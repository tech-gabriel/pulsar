import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (orig) => ({ ...(await orig<typeof import('react-router-dom')>()), useNavigate: () => navigate }));
vi.mock('../../components/ui/Header', () => ({ default: () => null }));
vi.mock('../../hooks/useTheme', () => ({ useTheme: () => ({ theme: 'light' }) }));
const estado = vi.hoisted(() => ({ subs: [] as unknown[], erro: null as string | null }));
vi.mock('../../hooks/useSubprefeituras', () => ({ useSubprefeituras: () => ({ subprefeituras: estado.subs, carregando: false, erro: estado.erro, recarregar: vi.fn(), ultimaAtualizacao: null }) }));

import DashboardPage from '../../pages/DashboardPage';

const leitura = { chuvaMmH: 4, ventoKmH: 18, visibilidadeKm: 9, indiceUv: 2, temperaturaC: 24, sensacaoTermica: 26, umidade: 82, timestamp: '' };
const s = (id: string, nome: string, valor: number, faixa: string) => ({ id, nome, zona: 'Leste', latitude: 0, longitude: 0, temperaturaAtual: 24, ultimaLeitura: leitura, faixaRisco: faixa, scoreAtual: { valor, faixa, timestamp: '', perigoPrincipal: 'ALAGAMENTO' } });

describe('DashboardPage (B)', () => {
  it('cidade agora, mais críticas e clima; sem métrica por zona', () => {
    estado.subs = [s('s1', 'Itaquera', 78, 'ALTO'), s('s2', 'Mooca', 49, 'MODERADO'), s('s3', 'Penha', 12, 'BAIXO')];
    estado.erro = null;
    const { container } = render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(screen.getByText('1 em risco alto, 1 em atenção')).toBeInTheDocument();
    expect(screen.getByText('Mais críticas agora')).toBeInTheDocument();
    expect(screen.getByText('Clima na cidade')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/regi(ão|ões)/i);
    fireEvent.click(screen.getByRole('button', { name: /Itaquera/ }));
    expect(navigate).toHaveBeenCalledWith('/app?regiao=itaquera');
  });

  it('erro da API mostra o aviso com tentar de novo', () => {
    estado.subs = [];
    estado.erro = 'Não foi possível carregar os dados.';
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(screen.getByText('Não foi possível carregar os dados.')).toBeInTheDocument();
  });
});
