import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { QualidadeDadosDto, ResumoGradeAreaDto } from '../../types';

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

const gradeState = {
  linhas: [] as ResumoGradeAreaDto[],
  carregando: false,
  erro: false,
};
const useResumoGrade = vi.fn((dias: number) => { void dias; return gradeState; });
vi.mock('../../hooks/useResumoGrade', () => ({
  useResumoGrade: (dias: number) => useResumoGrade(dias),
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
  useResumoGrade.mockClear();
  gradeState.linhas = [];
  gradeState.carregando = false;
  gradeState.erro = false;
  hookState.dados = {
    dias: 7,
    openMeteoDisponivel: true,
    avisos: [],
    geoSampa: { ultimaTentativa: null, ultimaTentativaSucesso: null, ultimoErro: null, ultimoSucesso: null, novasNoUltimoSucesso: null },
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

  it('aviso da cidade inteira sai sem subprefeitura nem dia', () => {
    hookState.dados!.avisos = [{ tipo: 'geosampa-parado', subprefeitura: '', dia: '2026-10-26', detalhe: '5 dias sem sincronizar' }];
    hookState.dados!.geoSampa = {
      ultimaTentativa: new Date().toISOString(), ultimaTentativaSucesso: false, ultimoErro: 'recusada',
      ultimoSucesso: null, novasNoUltimoSucesso: null,
    };
    renderPage();
    expect(screen.getByText('GeoSampa parado')).toBeInTheDocument();
    expect(screen.getByText(/Nenhum sucesso registrado. A última tentativa, .*, falhou./)).toBeInTheDocument();
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

describe('QualidadeAdminPage: risco por trecho (em teste)', () => {
  const linha = (subprefeitura: string, extra: Partial<ResumoGradeAreaDto> = {}): ResumoGradeAreaDto => ({
    subprefeitura, celulas: 48, ciclos: 672, maxValorArea: 41.26, maxMeioTermo: 63.5,
    ciclosAreaAlto: 0, ciclosMeioTermoAlto: 3, ciclosFaixaDiferente: 5, maxCelulasAlto: 9, ...extra,
  });

  it('mostra uma linha por área com os números da comparação', () => {
    gradeState.linhas = [linha('Mooca'), linha('Lapa', { celulas: 53, ciclosFaixaDiferente: 0 })];
    renderPage();

    const secao = screen.getByRole('region', { name: 'Risco por trecho (em teste)' });
    const mooca = within(secao).getByRole('row', { name: /Mooca/ });
    expect(within(mooca).getAllByRole('cell').map((c) => c.textContent)).toEqual(
      ['Mooca', '48', '672', '41,3', '63,5', '5', '9'],
    );
    expect(within(secao).getByRole('row', { name: /Lapa/ })).toBeInTheDocument();
  });

  it('sem ciclo com risco diz isso em vez de uma tabela vazia', () => {
    renderPage();
    const secao = screen.getByRole('region', { name: 'Risco por trecho (em teste)' });
    expect(within(secao).getByText('Nenhum ciclo com risco no período.')).toBeInTheDocument();
    expect(within(secao).queryByRole('table')).not.toBeInTheDocument();
  });

  it('falha na comparação não derruba o resto da página', () => {
    gradeState.erro = true;
    renderPage();
    expect(screen.getByText('Não foi possível carregar a comparação.')).toBeInTheDocument();
    expect(screen.getByText('Nenhum problema nos últimos 7 dias.')).toBeInTheDocument();
  });

  it('acompanha o período escolhido na página', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '30 dias' }));
    expect(useResumoGrade).toHaveBeenLastCalledWith(30);
  });
});
