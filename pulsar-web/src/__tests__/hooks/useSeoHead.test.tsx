import { render, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { useSeoHead } from '../../hooks/useSeoHead';

function Pagina() {
  useSeoHead({ title: 'Pulsar · Sobre', descricao: 'Descrição de teste.', path: '/sobre' });
  return null;
}

describe('useSeoHead', () => {
  it('define title, canonical e og por página', async () => {
    render(
      <UnheadProvider head={createHead()}>
        <Pagina />
      </UnheadProvider>,
    );
    await waitFor(() => expect(document.title).toBe('Pulsar · Sobre'));
    const canonical = document.head.querySelector('link[rel="canonical"]');
    expect(canonical).toHaveAttribute('href', 'https://app-pulsar.com.br/sobre');
    const ogUrl = document.head.querySelector('meta[property="og:url"]');
    expect(ogUrl).toHaveAttribute('content', 'https://app-pulsar.com.br/sobre');
    const desc = document.head.querySelector('meta[name="description"]');
    expect(desc).toHaveAttribute('content', 'Descrição de teste.');
  });
});
