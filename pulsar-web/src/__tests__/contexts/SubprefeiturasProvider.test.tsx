import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../api/client', () => ({ default: { get: vi.fn() } }));
const auth = vi.hoisted(() => ({ estaAutenticado: true }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => auth }));

import api from '../../api/client';
import { SubprefeiturasProvider } from '../../contexts/SubprefeiturasProvider';
import { useSubprefeituras } from '../../hooks/useSubprefeituras';

const mockedGet = (api as unknown as { get: ReturnType<typeof vi.fn> }).get;

function Sonda() {
  const { subprefeituras, erro } = useSubprefeituras();
  return <p>{erro ?? subprefeituras.map((s) => `${s.nome}/${s.zona}`).join(',')}</p>;
}

describe('SubprefeiturasProvider', () => {
  beforeEach(() => { mockedGet.mockReset(); auth.estaAutenticado = true; });

  it('busca a lista única uma vez e expõe para o app', async () => {
    mockedGet.mockResolvedValue({ data: [{ id: 's1', nome: 'Mooca', zona: 'Leste' }] });
    render(<SubprefeiturasProvider><Sonda /></SubprefeiturasProvider>);
    expect(await screen.findByText('Mooca/Leste')).toBeInTheDocument();
    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(mockedGet).toHaveBeenCalledWith('/subprefeituras');
  });

  it('falha vira mensagem de erro', async () => {
    mockedGet.mockRejectedValue(new Error('rede'));
    render(<SubprefeiturasProvider><Sonda /></SubprefeiturasProvider>);
    expect(await screen.findByText(/Não foi possível carregar os dados/)).toBeInTheDocument();
  });

  it('deslogado não busca', async () => {
    auth.estaAutenticado = false;
    render(<SubprefeiturasProvider><Sonda /></SubprefeiturasProvider>);
    await waitFor(() => expect(mockedGet).not.toHaveBeenCalled());
  });
});
