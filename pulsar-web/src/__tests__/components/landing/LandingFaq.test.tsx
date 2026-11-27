import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LandingFaq from '../../../components/landing/LandingFaq';

async function abrir(pergunta: string) {
  render(<LandingFaq />);
  await userEvent.setup().click(screen.getByRole('button', { name: pergunta }));
}

describe('LandingFaq', () => {
  it('FAQ diz que cobre São Paulo e a Baixada Santista', async () => {
    await abrir('Onde o Pulsar funciona?');
    expect(screen.getByText(/^Em São Paulo e na Baixada Santista\./)).toBeInTheDocument();
  });

  it('as fontes de cada cidade: CGE só na capital, CEMADEN e Serviço Geológico do Brasil na Baixada', async () => {
    await abrir('De onde vêm os dados?');
    const resposta = screen.getByText(/^De fontes oficiais e públicas\./).textContent;
    expect(resposta).toMatch(/Em São Paulo, a chuva medida vem dos postos do CGE-SP/);
    expect(resposta).toMatch(/Na Baixada Santista, a chuva medida vem das estações do CEMADEN/);
    expect(resposta).toMatch(/Serviço Geológico do Brasil/);
  });
});
