import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MapaCena, { VIEWBOX_COMPACTO } from '../../components/landing/MapaCena';
import { SUBPREFEITURAS, VIEWBOX } from '../../components/landing/mapaPaths';

describe('MapaCena', () => {
  it('desenha as 32 subprefeituras em qualquer cena', () => {
    const { container } = render(<MapaCena cena="acender" />);
    expect(container.querySelectorAll('path[data-subprefeitura]')).toHaveLength(
      SUBPREFEITURAS.length,
    );
  });

  it('na cena "acender" o mapa está apagado (sem cor de risco)', () => {
    const { container } = render(<MapaCena cena="acender" />);
    const coloridos = container.querySelectorAll('path[data-risco]');
    expect(coloridos).toHaveLength(0);
  });

  it('na cena "risco" cada subprefeitura ganha uma faixa de risco', () => {
    const { container } = render(<MapaCena cena="risco" />);
    expect(container.querySelectorAll('path[data-risco]')).toHaveLength(
      SUBPREFEITURAS.length,
    );
  });

  it('na cena "score" destaca uma subprefeitura e mostra o número', () => {
    const { container } = render(<MapaCena cena="score" />);
    expect(container.querySelectorAll('path[data-foco="true"]')).toHaveLength(1);
    expect(screen.getByText('72')).toBeInTheDocument();
  });

  it('na cena "alagamento" mostra os pontos de ocorrência', () => {
    const { container } = render(<MapaCena cena="alagamento" />);
    expect(container.querySelectorAll('circle[data-alagamento]').length).toBeGreaterThan(0);
  });

  it('na cena "alerta" anuncia o alerta em texto acessível', () => {
    render(<MapaCena cena="alerta" />);
    expect(screen.getByRole('status')).toHaveTextContent(/risco alto/i);
  });

  it('o SVG é decorativo para leitores de tela', () => {
    const { container } = render(<MapaCena cena="risco" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('por padrão usa o viewBox cheio (comportamento da narrativa preservado)', () => {
    const { container } = render(<MapaCena cena="risco" />);
    expect(container.querySelector('svg')).toHaveAttribute('viewBox', VIEWBOX);
    // Sem `compacta` nada é mascarado: a narrativa em tela cheia mostra o mapa inteiro.
    expect(container.querySelector('[data-mascarado]')).toBeNull();
    expect(container.querySelector('mask')).toBeNull();
  });

  it('o recorte compacto herda a largura do viewBox gerado', () => {
    // Trava o acoplamento com `npm run mapa:svg`: se o gerador mudar `LARGURA`,
    // o recorte do hero acompanha em vez de renderizar numa escala errada.
    const [, , larguraCheia] = VIEWBOX.split(' ');
    const [, , larguraCompacta, alturaCompacta] = VIEWBOX_COMPACTO.split(' ');
    expect(larguraCompacta).toBe(larguraCheia);
    expect(Number(alturaCompacta)).toBeLessThan(Number(VIEWBOX.split(' ')[3]));
  });

  it('com "compacta" recorta a base sem remover subprefeituras do SVG', () => {
    const { container } = render(<MapaCena cena="risco" compacta />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', VIEWBOX_COMPACTO);
    expect(container.querySelectorAll('path[data-subprefeitura]')).toHaveLength(
      SUBPREFEITURAS.length,
    );
  });

  it('com "compacta" dissolve a base para a linha de corte não ficar chapada', () => {
    // O corte em 920 atravessa Capela do Socorro e M'Boi Mirim (não existe linha
    // limpa acima de 1542), então a borda reta precisa sumir num fade.
    const { container } = render(<MapaCena cena="risco" compacta />);
    const grupo = container.querySelector('g[data-mascarado="true"]');
    expect(grupo).not.toBeNull();

    const mascara = container.querySelector('mask');
    expect(mascara).not.toBeNull();
    expect(grupo?.getAttribute('mask')).toBe(`url(#${mascara?.id})`);

    // O gradiente referenciado pela máscara existe e termina transparente.
    const gradiente = container.querySelector('linearGradient');
    expect(mascara?.querySelector('rect')?.getAttribute('fill')).toBe(
      `url(#${gradiente?.id})`,
    );
    const paradas = gradiente?.querySelectorAll('stop');
    expect(paradas?.[paradas.length - 1].getAttribute('stop-opacity')).toBe('0');
  });

  it('dois mapas na mesma página não colidem de id de máscara', () => {
    const { container } = render(
      <>
        <MapaCena cena="risco" compacta />
        <MapaCena cena="risco" compacta />
      </>,
    );
    const ids = [...container.querySelectorAll('mask')].map((m) => m.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    // E cada id precisa ser referenciável por `url(#...)` (sem `:` ou `«»` do useId).
    for (const id of ids) expect(id).toMatch(/^[a-zA-Z0-9-]+$/);
  });
});
