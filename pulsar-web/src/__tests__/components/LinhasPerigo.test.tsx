import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LinhasPerigo from '../../components/painel/LinhasPerigo';
import type { ScoreDto, LeituraDto } from '../../types';

const leitura = { ventoKmH: 12.4, sensacaoTermica: 25.2 } as LeituraDto;

describe('LinhasPerigo', () => {
  it('mostra uma linha por perigo com faixa e o dado que explica', () => {
    const score: ScoreDto = {
      valor: 65, faixa: 'ALTO', timestamp: '2026-10-01T00:00:00Z', perigoPrincipal: 'ALAGAMENTO',
      componentes: {
        alagamento: { valor: 65, faixa: 'ALTO' },
        vento: { valor: 9, faixa: 'BAIXO' },
        calor: { valor: 0, faixa: 'BAIXO' },
      },
      chuva3hMm: 12.3, chuva48hMm: 41,
    };

    render(<LinhasPerigo score={score} leitura={leitura} />);

    expect(screen.getByText('Alagamento')).toBeInTheDocument();
    expect(screen.getByText(/12,3 mm em 3h/)).toBeInTheDocument();
    expect(screen.getByText(/41 mm em 48h/)).toBeInTheDocument();
    expect(screen.getByText(/12 km\/h/)).toBeInTheDocument();
    expect(screen.getByText(/sensação 25 °C/)).toBeInTheDocument();
  });

  it('não renderiza nada sem componentes (API antiga ou score pré-migração)', () => {
    const { container } = render(
      <LinhasPerigo score={{ valor: 40, faixa: 'MODERADO', timestamp: 'x' }} leitura={leitura} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('sem leitura ainda mostra o alagamento e omite vento e calor sem quebrar', () => {
    const score: ScoreDto = {
      valor: 10, faixa: 'BAIXO', timestamp: 'x', perigoPrincipal: 'ALAGAMENTO',
      componentes: {
        alagamento: { valor: 10, faixa: 'BAIXO' },
        vento: { valor: 0, faixa: 'BAIXO' },
        calor: { valor: 0, faixa: 'BAIXO' },
      },
    };
    render(<LinhasPerigo score={score} leitura={null} />);
    expect(screen.getByText(/0 mm em 3h/)).toBeInTheDocument();
    expect(screen.queryByText(/km\/h/)).not.toBeInTheDocument();
  });
});
