import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { DicaDto } from '../../../types';

const dados = vi.hoisted(() => ({ catalogo: [] as DicaDto[] }));
vi.mock('../../../hooks/useNotificacoesPrefs', () => ({ useNotificacoesPrefs: () => ({ prefs: {} }) }));
vi.mock('../../../hooks/usePushSubscription', () => ({ usePushSubscription: () => ({ estado: 'ativo' }) }));
vi.mock('../../../features/compartilhar/BotaoCompartilhar', () => ({ default: () => null }));
vi.mock('../../../hooks/usePrevisaoSubprefeitura', () => ({ usePrevisaoSubprefeitura: () => ({ faixas: [], carregando: false, erro: null }) }));
vi.mock('../../../hooks/useCatalogoDicas', () => ({ useCatalogoDicas: () => dados.catalogo }));

import DetalheSubprefeitura from '../../../components/painel/DetalheSubprefeitura';
import type { Area } from '../../../features/cidade/areas';

const d = (categoria: DicaDto['categoria'], faixa: DicaDto['faixa'], ordem: number): DicaDto =>
  ({ id: `${categoria}${faixa}${ordem}`, categoria, faixa, titulo: `${categoria} dica ${ordem}`, descricao: 'Descrição', ordem });
const CATALOGO = [1, 2, 3].flatMap((o) => [d('ALAGAMENTO', 'ALTO', o), d('CALOR', 'MODERADO', o)]);

const area = (alagamento: 'BAIXO' | 'MODERADO' | 'ALTO', calor: 'BAIXO' | 'MODERADO' | 'ALTO') => ({
  id: 's1', nome: 'Itaquera', zona: 'Leste', latitude: 0, longitude: 0, temperaturaAtual: 30, faixaRisco: 'ALTO',
  scoreAtual: {
    valor: 78, faixa: 'ALTO', timestamp: '', perigoPrincipal: 'ALAGAMENTO', chuva3hMm: 22,
    componentes: { alagamento: { valor: 78, faixa: alagamento }, vento: { valor: 5, faixa: 'BAIXO' }, calor: { valor: 40, faixa: calor } },
  },
  ultimaLeitura: null,
}) as unknown as Area;

const renderiza = (a: Area) =>
  render(<MemoryRouter><DetalheSubprefeitura area={a} isFavorito={() => false} onToggleFavorito={vi.fn()} onFechar={vi.fn()} /></MemoryRouter>);

beforeEach(() => { dados.catalogo = CATALOGO; });

describe('DetalheSubprefeitura: dicas por perigo', () => {
  it('um bloco por perigo ativo, principal primeiro, e o aviso de estimativa', () => {
    renderiza(area('ALTO', 'MODERADO'));
    const titulos = screen.getAllByRole('heading', { level: 4 }).map((h) => h.textContent);
    expect(titulos).toEqual(['Alagamento · Alerta', 'Calor · Atenção']);
    expect(screen.getAllByText(/dica \d/)).toHaveLength(6);
    expect(screen.getByText(/Estimativa do Pulsar\. Em emergência, ligue 199/)).toBeInTheDocument();
  });

  it('perigo em Tranquilo não ganha bloco', () => {
    renderiza(area('ALTO', 'BAIXO'));
    expect(screen.getAllByRole('heading', { level: 4 }).map((h) => h.textContent)).toEqual(['Alagamento · Alerta']);
  });

  it('catálogo vazio (carregando ou falhou): sem bloco, sem erro, com o aviso', () => {
    dados.catalogo = [];
    renderiza(area('ALTO', 'MODERADO'));
    expect(screen.queryByText('Como se proteger')).not.toBeInTheDocument();
    expect(screen.getByText(/Estimativa do Pulsar/)).toBeInTheDocument();
  });
});
