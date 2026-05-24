import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton, SkeletonCardSubprefeitura, SkeletonRegioesLista } from '../../components/ui/Skeleton';

describe('Skeleton', () => {
  it('renderiza com animate-pulse', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('aplica className adicional', () => {
    const { container } = render(<Skeleton className="h-4 w-40" />);
    expect(container.firstChild).toHaveClass('h-4', 'w-40', 'animate-pulse');
  });
});

describe('SkeletonCardSubprefeitura', () => {
  it('renderiza elementos com animate-pulse', () => {
    const { container } = render(<SkeletonCardSubprefeitura />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });
});

describe('SkeletonRegioesLista', () => {
  it('renderiza exatamente 5 itens', () => {
    const { container } = render(<SkeletonRegioesLista />);
    expect(container.querySelectorAll('.border-b').length).toBe(5);
  });
});
