import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (orig) => ({ ...(await orig<typeof import('react-router-dom')>()), useNavigate: () => navigate }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ usuario: { id: 'u1', nome: 'Ana', role: 'USER' }, logout: vi.fn() }) }));
vi.mock('../../hooks/useTheme', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }) }));
const dados = vi.hoisted(() => ({ subs: [] as unknown[], favs: [] as { subprefeituraId: string }[] }));
vi.mock('../../hooks/useSubprefeituras', () => ({ useSubprefeituras: () => ({ subprefeituras: dados.subs, carregando: false, erro: null, recarregar: vi.fn(), ultimaAtualizacao: null }) }));
vi.mock('../../hooks/useFavoritos', () => ({ useFavoritos: () => ({ favoritos: dados.favs, carregando: false }) }));

import Header from '../../components/ui/Header';

const s = (id: string, nome: string, faixa: string) => ({ id, nome, zona: 'Leste', faixaRisco: faixa, scoreAtual: { valor: faixa === 'ALTO' ? 80 : 45, faixa, timestamp: '' } });
const abrir = () => fireEvent.click(screen.getByRole('button', { name: /Notificações/ }));

describe('Sino pessoal primeiro', () => {
  beforeEach(() => navigate.mockClear());

  it('favoritas em baixo e risco alto em outra área: sino apagado, mas "Na cidade" mostra', () => {
    dados.subs = [s('s1', 'Itaquera', 'ALTO'), s('s3', 'Penha', 'BAIXO')];
    dados.favs = [{ subprefeituraId: 's3' }];
    render(<MemoryRouter><Header /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Notificações' })).toBeInTheDocument();
    abrir();
    expect(screen.getByText('Na cidade')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Itaquera/ }));
    expect(navigate).toHaveBeenCalledWith('/app?regiao=itaquera');
  });

  it('favorita em alto acende o sino', () => {
    dados.subs = [s('s1', 'Itaquera', 'ALTO')];
    dados.favs = [{ subprefeituraId: 's1' }];
    render(<MemoryRouter><Header /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Notificações: 1 em alerta' })).toBeInTheDocument();
    abrir();
    expect(screen.getByText('Suas subprefeituras')).toBeInTheDocument();
  });

  it('sem favoritas conta a cidade; tudo calmo diz tranquilo', () => {
    dados.subs = [s('s3', 'Penha', 'BAIXO')];
    dados.favs = [];
    render(<MemoryRouter><Header /></MemoryRouter>);
    abrir();
    expect(screen.getByText('Tudo tranquilo em São Paulo')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/regi(ão|ões)/i);
  });
});
