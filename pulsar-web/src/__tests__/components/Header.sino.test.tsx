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

  // V1 C (escolha do user, 18/11/2026): alerta da capital inteira não vira 32 linhas no sino.
  it('alerta oficial em muitas áreas: as suas uma a uma e o resto numa linha que abre a cidade', () => {
    const alertaCapital = { identificador: 'x', evento: 'CHUVAS INTENSAS', gravidade: 'Moderate', emissor: 'Defesa Civil Estadual De São Paulo', titulo: 't', descricao: 'd', instrucao: '', inicioUtc: '2026-11-18T15:00:00Z', expiraUtc: '2099-11-18T19:00:00Z' };
    dados.subs = Array.from({ length: 8 }, (_, i) => ({ ...s(`s${i}`, `Área ${i}`, 'BAIXO'), cidade: 'São Paulo', alertasOficiais: [alertaCapital] }));
    dados.favs = [{ subprefeituraId: 's0' }];
    render(<MemoryRouter><Header /></MemoryRouter>);
    abrir();
    expect(screen.getByRole('button', { name: /Área 0/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /E mais 7 áreas da capital/ }));
    expect(navigate).toHaveBeenCalledWith('/app?cidade=S%C3%A3o%20Paulo');
  });

  it('com as duas cidades, o grupo das favoritas é "Suas áreas"', () => {
    dados.subs = [{ ...s('s1', 'Itaquera', 'ALTO'), cidade: 'São Paulo' }, { ...s('b1', 'Santos', 'BAIXO'), cidade: 'Baixada Santista' }];
    dados.favs = [{ subprefeituraId: 's1' }];
    render(<MemoryRouter><Header /></MemoryRouter>);
    abrir();
    expect(screen.getByText('Suas áreas')).toBeInTheDocument();
  });
});
