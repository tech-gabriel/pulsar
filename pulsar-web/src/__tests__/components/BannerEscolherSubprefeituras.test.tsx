import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BannerEscolherSubprefeituras from '../../components/mapa/BannerEscolherSubprefeituras';

beforeEach(() => sessionStorage.clear());

describe('BannerEscolherSubprefeituras', () => {
  it('explica a mudança e leva a escolher', () => {
    const onEscolher = vi.fn();
    render(<BannerEscolherSubprefeituras onEscolher={onEscolher} />);

    expect(screen.getByText(/agora avisa por subprefeitura/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Escolher' }));
    expect(onEscolher).toHaveBeenCalled();
  });

  it('some ao dispensar e não volta na mesma sessão', () => {
    const { unmount } = render(<BannerEscolherSubprefeituras onEscolher={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dispensar' }));
    expect(screen.queryByText(/agora avisa por subprefeitura/i)).not.toBeInTheDocument();
    unmount();

    render(<BannerEscolherSubprefeituras onEscolher={() => {}} />);
    expect(screen.queryByText(/agora avisa por subprefeitura/i)).not.toBeInTheDocument();
  });
});
