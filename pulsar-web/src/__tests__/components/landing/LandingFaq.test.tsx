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
    const resposta = screen.getByText(/^A maior parte vem de fontes oficiais\./).textContent;
    expect(resposta).toMatch(/Em São Paulo, a chuva medida vem dos postos do CGE-SP/);
    expect(resposta).toMatch(/Na Baixada Santista, a chuva medida vem das estações do CEMADEN/);
    expect(resposta).toMatch(/Serviço Geológico do Brasil/);
  });

  it('os modelos são fontes públicas, não oficiais', async () => {
    await abrir('De onde vêm os dados?');
    const resposta = screen.getByText(/^A maior parte vem de fontes oficiais\./).textContent;
    expect(resposta).toMatch(/OpenWeatherMap, conferida com o Open-Meteo, duas fontes públicas de previsão\./);
    expect(resposta).not.toMatch(/oficiais e públicas/);
  });

  it('o histórico da capital tem um crédito só nas duas respostas', async () => {
    const credito = 'histórico de alagamentos da Defesa Civil de São Paulo, publicado no GeoSampa';
    await abrir('De onde vêm os dados?');
    expect(screen.getByText(/^A maior parte vem de fontes oficiais\./).textContent).toContain('histórico de alagamentos é o da Defesa Civil de São Paulo, publicado no GeoSampa');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Como o Score de Perigo é calculado?' }));
    expect(screen.getByText(/^O Pulsar mede três perigos/).textContent).toContain(credito);
  });
});
