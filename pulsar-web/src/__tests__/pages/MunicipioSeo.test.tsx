import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { createHead, UnheadProvider } from '@unhead/react/client';
import RegiaoSeoPage from '../../pages/RegiaoSeoPage';

function renderRota(path: string) {
  return render(
    <UnheadProvider head={createHead()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/risco-de-alagamento/:zona" element={<RegiaoSeoPage />} />
        </Routes>
      </MemoryRouter>
    </UnheadProvider>,
  );
}

describe('página de município da Baixada', () => {
  it('Santos: título, números e sem alagamentos registrados', async () => {
    renderRota('/risco-de-alagamento/santos');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Risco de alagamento em Santos');
    expect(screen.getByText('129 dos 397 trechos de Santos ficam em área de risco de inundação. A chuva vem das estações do CEMADEN e os alertas, da Defesa Civil.')).toBeInTheDocument();
    expect(screen.getByText('129')).toBeInTheDocument();
    expect(screen.getByText('de 397 no mapa da cidade')).toBeInTheDocument();
    const cartaoRecente = screen.getByText('alagamento mais recente marcado').parentElement!;
    expect(cartaoRecente).toHaveTextContent('06/08/2025');
    expect(cartaoRecente).toHaveTextContent('Rua Governador Pedro de Toledo');
    expect(screen.queryByText(/alagamentos registrados/i)).toBeNull();
    expect(within(screen.getByRole('navigation', { name: 'breadcrumb' })).getByRole('link', { name: 'Baixada Santista' }))
      .toHaveAttribute('href', '/baixada-santista');
    expect(screen.getByRole('link', { name: /ver risco ao vivo em Santos/i })).toHaveAttribute('href', '/cadastro?regiao=santos');
    const outras = within(screen.getByRole('navigation', { name: 'Outras cidades da Baixada' })).getAllByRole('link');
    expect(outras).toHaveLength(9);
    expect(outras.map((a) => a.textContent)).not.toContain('Santos');
    await waitFor(() => expect(document.title).toBe('Risco de alagamento em Santos, Baixada Santista · Pulsar'));
    const ld = JSON.parse(document.querySelector('script[type="application/ld+json"]')!.textContent!);
    const about = ld['@graph'][0].about;
    expect(about).toMatchObject({ '@type': 'City', name: 'Santos', containedInPlace: { '@type': 'Place', name: 'Baixada Santista' } });
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute('content',
      'Veja onde costuma alagar em Santos: 129 de 397 trechos ficam em área de risco de inundação. Receba alertas no celular quando o risco subir.');
  });

  it('lista os pontos de Santos com o nome', () => {
    renderRota('/risco-de-alagamento/santos');
    const lista = screen.getByRole('list', { name: 'Pontos onde já alagou' });
    expect(within(lista).getAllByRole('listitem')).toHaveLength(7);
    expect(within(lista).getByText('Praça Washington')).toBeInTheDocument();
    const noticia = within(lista).getAllByRole('link', { name: /Ver a notícia/ })[0];
    expect(noticia).toHaveAttribute('target', '_blank');
    expect(noticia.getAttribute('href')).toMatch(/^https:\/\//);
  });

  it('município sem pontos: dois cartões e a frase no lugar da lista', () => {
    renderRota('/risco-de-alagamento/bertioga');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Risco de alagamento em Bertioga');
    expect(screen.getByText('Ainda não marcamos nenhum ponto onde já alagou em Bertioga.')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Pontos onde já alagou' })).toBeNull();
    expect(screen.queryByText('alagamento mais recente marcado')).toBeNull();
  });

  it('subprefeitura continua resolvendo antes', () => {
    renderRota('/risco-de-alagamento/butanta');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Risco de alagamento no Butantã');
  });

  it('slug desconhecido segue em não encontrada', () => {
    renderRota('/risco-de-alagamento/ubatuba');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Região não encontrada');
  });
});
