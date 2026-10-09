import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import BlocoEstatisticas from '../../../components/seo/BlocoEstatisticas';
import type { PainelEstatisticas } from '../../../data/regiao-view';

const base: PainelEstatisticas = {
  diasCompletos: 60,
  diasAlerta: 3,
  chuvaTotalMm: 212.4,
  faixaPredominante: 'MODERADO',
  diaMaisChuvoso: { dia: '2026-11-14', mm: 38.2 },
  janelaDias: 90,
  atualizadoEm: '2026-11-16',
};

describe('BlocoEstatisticas', () => {
  it('mostra os 4 números com 60 dias completos, em pt-BR', () => {
    render(<BlocoEstatisticas estatisticas={base} escopo="subprefeitura" />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('dias em Alerta')).toBeInTheDocument();
    expect(screen.getByText('212,4 mm')).toBeInTheDocument();
    expect(screen.getByText('Atenção')).toBeInTheDocument();
    expect(screen.getByText('38,2 mm')).toBeInTheDocument();
    expect(screen.getByText('em 14/11')).toBeInTheDocument();
    expect(screen.getByText(/atualizada em 16\/11\/2026/)).toBeInTheDocument();
  });

  it('some com 59 dias completos e sem estatísticas', () => {
    const { container, rerender } = render(
      <BlocoEstatisticas estatisticas={{ ...base, diasCompletos: 59 }} escopo="subprefeitura" />,
    );
    expect(container).toBeEmptyDOMElement();
    rerender(<BlocoEstatisticas estatisticas={null} escopo="subprefeitura" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('sem chuva no período mostra "Sem chuva"', () => {
    render(<BlocoEstatisticas estatisticas={{ ...base, chuvaTotalMm: 0, diaMaisChuvoso: null }} escopo="subprefeitura" />);
    expect(screen.getByText('Sem chuva')).toBeInTheDocument();
  });

  it('na zona explica que a chuva é média e o recorde é de uma subprefeitura', () => {
    render(<BlocoEstatisticas estatisticas={base} escopo="zona" />);
    expect(screen.getByText('média por subprefeitura')).toBeInTheDocument();
    expect(screen.getByText('em 14/11, em uma das subprefeituras')).toBeInTheDocument();
  });
});
