import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({ usuario: { email: 'ana@x.com', emailVerificado: true as boolean | undefined } }));
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ usuario: h.usuario, recarregarUsuario: vi.fn().mockResolvedValue(undefined), reenviarConfirmacao: vi.fn() }),
}));
vi.mock('../../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));

import TelaPronto from '../../../features/ativacao/telas/TelaPronto';

const escolhidas = [{ id: 's1', nome: 'Mooca', faixaRisco: 'BAIXO' as const }, { id: 's2', nome: 'Penha', faixaRisco: 'MODERADO' as const }];

describe('TelaPronto', () => {
  beforeEach(() => { h.usuario.emailVerificado = true; });

  it('e-mail não confirmado: pede a confirmação como último passo (SEC1, opção D)', () => {
    h.usuario.emailVerificado = false;
    render(<TelaPronto primeiroNome="Ana" escolhidas={escolhidas} alerta="ativo" onVerMapa={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Último passo: confirme seu e-mail' })).toBeInTheDocument();
  });

  it('e-mail confirmado: sem pedido', () => {
    render(<TelaPronto primeiroNome="Ana" escolhidas={escolhidas} alerta="ativo" onVerMapa={vi.fn()} />);
    expect(screen.queryByRole('heading', { name: 'Último passo: confirme seu e-mail' })).toBeNull();
  });

  it('fecha o ciclo com nome, lugares e estado do alerta', () => {
    const onVerMapa = vi.fn();
    render(<TelaPronto primeiroNome="Gabriel" escolhidas={escolhidas} alerta="ativo" onVerMapa={onVerMapa} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tudo pronto, Gabriel');
    expect(screen.getByText('Mooca')).toBeInTheDocument();
    expect(screen.getByText('Alertas ligados neste aparelho')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver o mapa' }));
    expect(onVerMapa).toHaveBeenCalled();
  });

  it('alerta negado explica como liberar', () => {
    render(<TelaPronto primeiroNome="Ana" escolhidas={escolhidas} alerta="negado" onVerMapa={vi.fn()} />);
    expect(screen.getByText(/ficaram bloqueados; dá para liberar nas configurações do navegador/)).toBeInTheDocument();
  });

  it('sem favoritas não lista nada e não quebra', () => {
    render(<TelaPronto primeiroNome="Ana" escolhidas={[]} alerta="nao-pedido" onVerMapa={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tudo pronto, Ana');
  });
});
