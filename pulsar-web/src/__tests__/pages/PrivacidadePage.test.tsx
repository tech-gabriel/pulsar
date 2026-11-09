import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { ThemeProvider } from '../../hooks/ThemeProvider';
import PrivacidadePage from '../../pages/PrivacidadePage';

describe('PrivacidadePage', () => {
  it('menciona o uso de analytics (PostHog) e transferência internacional', () => {
    render(
      <UnheadProvider head={createHead()}>
        <ThemeProvider>
          <MemoryRouter>
            <PrivacidadePage />
          </MemoryRouter>
        </ThemeProvider>
      </UnheadProvider>,
    );
    expect(screen.getByText(/analytics/i)).toBeInTheDocument();
    expect(screen.getByText(/Estados Unidos/i)).toBeInTheDocument();
  });
});

describe('PrivacidadePage casa e trabalho (F4)', () => {
  function renderizar() {
    render(
      <UnheadProvider head={createHead()}>
        <ThemeProvider>
          <MemoryRouter>
            <PrivacidadePage />
          </MemoryRouter>
        </ThemeProvider>
      </UnheadProvider>,
    );
  }

  it('tem a seção Casa e trabalho com o que não é guardado', () => {
    renderizar();
    expect(screen.getByRole('heading', { name: 'Casa e trabalho' })).toBeInTheDocument();
    expect(
      screen.getByText(/Não guardamos horários, frequência nem os caminhos que você faz\./),
    ).toBeInTheDocument();
  });

  it('cita casa e trabalho nos dados, na base legal e nos backups', () => {
    renderizar();
    expect(screen.getByText(/o endereço e o ponto no mapa que você salvou\./)).toBeInTheDocument();
    expect(screen.getByText(/consentimento, dado quando você salva\. Você revoga apagando em Configurações\./)).toBeInTheDocument();
    expect(screen.getByText(/As cópias de segurança diárias guardam os dados por até 30 dias e depois são apagadas\./)).toBeInTheDocument();
  });

  it('explica o uso no mapa e no aviso de chuva (F4b)', () => {
    renderizar();
    expect(screen.getByText(/aparecem no seu mapa, só para você/)).toBeInTheDocument();
    expect(screen.getByText(/nunca entram na imagem de compartilhar/)).toBeInTheDocument();
    expect(screen.getByText(/avisar quando começar a chover na região de cada um/)).toBeInTheDocument();
    expect(screen.getByText(/Avisar quando começar a chover perto da sua casa ou do seu trabalho:/)).toBeInTheDocument();
  });

  it('não promete botão de excluir conta e não usa travessão', () => {
    renderizar();
    expect(screen.queryByText(/revogar o consentimento e excluir sua conta/i)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain('—');
  });
});
