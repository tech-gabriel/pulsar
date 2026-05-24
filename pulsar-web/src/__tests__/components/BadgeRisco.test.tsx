import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BadgeRisco from '../../components/ui/BadgeRisco';

describe('BadgeRisco', () => {
  it.each([
    ['BAIXO' as const, 'Baixo'],
    ['MODERADO' as const, 'Moderado'],
    ['ALTO' as const, 'Alto'],
  ])('exibe label correto para faixa %s', (faixa, label) => {
    render(<BadgeRisco faixa={faixa} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('exibe "Sem dados" quando faixa é null', () => {
    render(<BadgeRisco faixa={null} />);
    expect(screen.getByText('Sem dados')).toBeInTheDocument();
  });

  it('exibe o score formatado quando fornecido', () => {
    render(<BadgeRisco faixa="ALTO" score={75.5} />);
    expect(screen.getByText('75.5')).toBeInTheDocument();
  });

  it('não exibe score quando omitido', () => {
    const { container } = render(<BadgeRisco faixa="BAIXO" />);
    const nums = container.querySelectorAll('.font-mono.font-semibold');
    expect(nums).toHaveLength(0);
  });

  it('aplica tamanho sm com texto menor', () => {
    const { container } = render(<BadgeRisco faixa="BAIXO" size="sm" />);
    expect(container.firstChild).toHaveClass('text-xs');
  });

  it('aplica tamanho md por padrão', () => {
    const { container } = render(<BadgeRisco faixa="BAIXO" />);
    expect(container.firstChild).toHaveClass('text-sm');
  });
});
