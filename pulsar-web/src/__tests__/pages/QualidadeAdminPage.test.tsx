import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { QualidadeDadosDto } from '../../types';

vi.mock('../../components/ui/Header', () => ({ default: () => null }));

const hookState = {
  dados: null as QualidadeDadosDto | null,
  carregando: false,
  erro: false,
  recarregar: vi.fn(),
};
const useQualidadeAdmin = vi.fn((dias: number) => { void dias; return hookState; });
vi.mock('../../hooks/useQualidadeAdmin', () => ({
  useQualidadeAdmin: (dias: number) => useQualidadeAdmin(dias),
}));

import QualidadeAdminPage from '../../pages/admin/QualidadeAdminPage';

const dia = (d: string, pulsar: number | null) => ({
  dia: d, chuvaPulsarMm: pulsar, chuvaOpenMeteoMm: 3.1, horasBarradas: null, horasIncompletas: null, pontosCge: 0, teveAlerta: false,
});

function renderPage() {
  return render(
    <MemoryRouter>
      <QualidadeAdminPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  useQualidadeAdmin.mockClear();
  hookState.dados = {
    dias: 7,
    openMeteoDisponivel: true,
    avisos: [],
    subprefeituras: [{
      id: 'se', nome: 'Sé', chuvaPulsarMm: 46.2, chuvaOpenMeteoMm: 3.1, horasBarradas: null, horasIncompletas: null, pontosCge: 0,
      dias: [dia('2026-10-26', 46.2), dia('2026-10-25', null)],
    }],
  };
});

describe('QualidadeAdminPage', () => {
  it('sem avisos diz que não há problema no período', () => {
    renderPage();
    expect(screen.getByText('Nenhum problema nos últimos 7 dias.')).toBeInTheDocument();
  });

  it('lista os avisos com subprefeitura, dia e detalhe', () => {
    hookState.dados!.avisos = [{
      tipo: 'chuva-nao-aconteceu', subprefeitura: 'Sé', dia: '2026-10-26', detalhe: 'Pulsar 46,2 mm, Open-Meteo 3,1 mm',
    }];
    renderPage();
    expect(screen.getByText('Chuva que não aconteceu: Sé, 26/10')).toBeInTheDocument();
    expect(screen.getByText('Pulsar 46,2 mm, Open-Meteo 3,1 mm')).toBeInTheDocument();
  });

  it('abrir a linha mostra os dias, com s/d onde falta dado', () => {
    renderPage();
    expect(screen.queryByText('25/10')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Sé/ }));

    expect(screen.getByText('25/10')).toBeInTheDocument();
    expect(screen.getAllByText('46,2')).toHaveLength(2);
  });

  it('avisa quando o Open-Meteo não respondeu', () => {
    hookState.dados!.openMeteoDisponivel = false;
    renderPage();
    expect(screen.getByText(/O Open-Meteo não respondeu/)).toBeInTheDocument();
  });

  it('trocar para 30 dias pede o período novo', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '30 dias' }));
    expect(useQualidadeAdmin).toHaveBeenLastCalledWith(30);
  });
});
