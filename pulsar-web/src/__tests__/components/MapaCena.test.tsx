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

  it('na cena "score" o número fica sobre a subprefeitura em foco', () => {
    // Regressão: o número era centralizado no container (50%/50%), o que o
    // jogava ~320 unidades do viewBox abaixo da Sé, sobre Jabaquara/Santo
    // Amaro, sem encostar na região que ele rotula.
    const { container } = render(<MapaCena cena="score" />);
    const numero = screen.getByText('72');
    const foco = container.querySelector<SVGPathElement>('path[data-foco="true"]');

    const nums = foco!.getAttribute('d')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    const xs = nums.filter((_, i) => i % 2 === 0);
    const ys = nums.filter((_, i) => i % 2 === 1);
    const [, , largura, altura] = VIEWBOX.split(' ').map(Number);
    const centroX = ((Math.min(...xs) + Math.max(...xs)) / 2 / largura) * 100;
    const centroY = ((Math.min(...ys) + Math.max(...ys)) / 2 / altura) * 100;

    // Tolerância de 1 ponto percentual: a posição tem que sair do polígono,
    // não de uma constante solta.
    expect(parseFloat(numero.style.left)).toBeCloseTo(centroX, 0);
    expect(parseFloat(numero.style.top)).toBeCloseTo(centroY, 0);
    // E não pode ser o centro do container.
    expect(parseFloat(numero.style.top)).toBeLessThan(45);
  });

  it('na cena "alerta" a subprefeitura em foco fica em risco alto', () => {
    // O badge e o texto da cena dizem "risco alto"; a faixa determinística da
    // Sé é 'moderado', então sem a exceção o alerta vermelho apontava para um
    // polígono amarelo.
    const { container } = render(<MapaCena cena="alerta" />);
    const foco = container.querySelector('path[data-foco="true"]');
    expect(foco).toHaveAttribute('data-risco', 'alto');
  });

  it('fora da cena "alerta" o foco mantém a faixa determinística', () => {
    const { container } = render(<MapaCena cena="score" />);
    const foco = container.querySelector('path[data-foco="true"]');
    expect(foco).toHaveAttribute('data-risco', 'moderado');
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

  // Com as camadas sempre no DOM, teste de presença não prova nada: ele passa
  // igual se a camada estiver invisível em todas as cenas. A asserção tem que
  // ser sobre visibilidade. Foi exatamente este buraco que deixou passar a
  // tela em branco por três rodadas de review na narrativa anterior.
  describe('camadas sempre no DOM, visibilidade por cena', () => {
    it('os pontos de alagamento existem em toda cena', () => {
      for (const cena of ['acender', 'risco', 'score', 'alagamento', 'alerta'] as const) {
        const { container, unmount } = render(<MapaCena cena={cena} />);
        expect(container.querySelectorAll('[data-alagamento]').length).toBeGreaterThan(0);
        unmount();
      }
    });

    it('publica a cena na raiz', () => {
      const { container } = render(<MapaCena cena="score" />);
      expect(container.querySelector('[data-mapa-cena]')).toHaveAttribute(
        'data-mapa-cena',
        'score',
      );
    });

    it('cada subprefeitura carrega o seu índice para o stagger da onda', () => {
      const { container } = render(<MapaCena cena="acender" />);
      const paths = Array.from(container.querySelectorAll('[data-subprefeitura]'));
      expect(paths.length).toBeGreaterThan(0);
      paths.forEach((p, i) => {
        expect((p as HTMLElement).style.getPropertyValue('--i')).toBe(String(i));
      });
    });

    it('cada ponto de alagamento carrega o seu índice para o stagger do pop', () => {
      const { container } = render(<MapaCena cena="alagamento" />);
      const pontos = Array.from(container.querySelectorAll('[data-alagamento]'));
      pontos.forEach((p, i) => {
        expect((p as HTMLElement).style.getPropertyValue('--i')).toBe(String(i));
      });
    });

    // O badge é a exceção deliberada: monta condicionalmente por causa do
    // `role="status"`. Se ele passar a ficar sempre no DOM, o leitor de tela
    // anuncia no carregamento e nunca mais.
    it('o badge de alerta só monta na cena 5', () => {
      const { queryByRole, unmount } = render(<MapaCena cena="alagamento" />);
      expect(queryByRole('status')).not.toBeInTheDocument();
      unmount();
      render(<MapaCena cena="alerta" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('não usa a visibilidade para esconder o badge', () => {
      const { container } = render(<MapaCena cena="alagamento" />);
      expect(container.querySelector('[role="status"]')).toBeNull();
    });
  });

  describe('rótulos de texto sobre o mapa', () => {
    it('tem 5 rótulos de temperatura, sempre no DOM', () => {
      for (const cena of ['acender', 'risco', 'alerta'] as const) {
        const { container, unmount } = render(<MapaCena cena={cena} />);
        expect(container.querySelectorAll('[data-temperatura]')).toHaveLength(5);
        unmount();
      }
    });

    it('o rótulo da Sé existe e nomeia a região em foco', () => {
      const { container } = render(<MapaCena cena="score" />);
      const rotulo = container.querySelector('[data-rotulo-foco]');
      expect(rotulo).toBeInTheDocument();
      expect(rotulo).toHaveTextContent('Sé');
    });

    // Texto sobre o mapa é texto, não leitura do mapa: segue os tokens de tema
    // e por isso continua legível quando o tema padrão virar claro. Polígono e
    // círculo é que saem da paleta.ts.
    it('os rótulos usam tokens de tema, não a paleta do mapa', () => {
      const { container } = render(<MapaCena cena="risco" />);
      for (const el of container.querySelectorAll('[data-temperatura], [data-rotulo-foco]')) {
        expect(el.getAttribute('fill')).toBe('var(--text-primary)');
        expect(el.getAttribute('stroke')).toBe('var(--bg-primary)');
      }
    });

    it('o mapa compacto do hero não mostra rótulo de temperatura', () => {
      const { container } = render(<MapaCena cena="risco" compacta />);
      expect(container.querySelectorAll('[data-temperatura]')).toHaveLength(0);
    });
  });
});
