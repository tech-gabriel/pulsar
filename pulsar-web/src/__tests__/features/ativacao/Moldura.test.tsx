import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Moldura from '../../../features/ativacao/telas/Moldura';

describe('Moldura', () => {
  it('anuncia o progresso e oferece voltar e a ação do topo', () => {
    const onVoltar = vi.fn();
    const onAgoraNao = vi.fn();
    render(
      <Moldura total={5} indice={1} direcao={1} chave="escolher" onVoltar={onVoltar} acaoTopo={{ rotulo: 'Agora não', onClick: onAgoraNao }}>
        <h1>Conteúdo</h1>
      </Moldura>,
    );
    const barra = screen.getByRole('progressbar');
    expect(barra).toHaveAttribute('aria-valuenow', '2');
    expect(barra).toHaveAttribute('aria-valuemax', '5');
    expect(barra).toHaveAttribute('aria-label', 'Passo 2 de 5');
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agora não' }));
    expect(onVoltar).toHaveBeenCalled();
    expect(onAgoraNao).toHaveBeenCalled();
  });

  it('sem onVoltar não mostra o botão (primeira tela)', () => {
    render(<Moldura total={5} indice={0} direcao={1} chave="promessa"><p>x</p></Moldura>);
    expect(screen.queryByRole('button', { name: 'Voltar' })).not.toBeInTheDocument();
  });
});
