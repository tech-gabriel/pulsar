import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RegiaoCard from '../../components/painel/RegiaoCard';
import type { RegiaoDto } from '../../types';

const base: RegiaoDto = {
  id: 'r1', nome: 'Sul', scoreAgregado: 70, faixaRisco: 'ALTO',
  totalSubprefeituras: 9, ultimaAtualizacao: '2026-10-01T00:00:00Z',
};

function renderCard(regiao: RegiaoDto) {
  return render(
    <RegiaoCard regiao={regiao} ativa={false} favorito={false} onSelecionar={vi.fn()} onToggleFavorito={vi.fn()} />,
  );
}

describe('RegiaoCard motivo do risco', () => {
  it('mostra e anuncia o motivo quando o principal é calor', () => {
    renderCard({ ...base, perigoPrincipal: 'CALOR' });
    expect(screen.getByText(/por calor/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /risco alto, por calor/i })).toBeInTheDocument();
  });

  it('sem motivo quando o principal é alagamento ou não veio da API', () => {
    renderCard({ ...base, perigoPrincipal: 'ALAGAMENTO' });
    expect(screen.queryByText(/por /)).not.toBeInTheDocument();
  });
  it('dia seco com brisa (BAIXO por vento) não mostra motivo', () => {
    renderCard({ ...base, scoreAgregado: 8, faixaRisco: 'BAIXO', perigoPrincipal: 'VENTO' });
    expect(screen.queryByText(/por vento/)).not.toBeInTheDocument();
  });
});
