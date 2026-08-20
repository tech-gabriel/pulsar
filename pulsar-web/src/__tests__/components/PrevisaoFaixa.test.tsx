import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PrevisaoFaixa from '../../components/painel/PrevisaoFaixa';
import type { FaixaPrevisaoDto } from '../../types';

const mockUsePrevisao = vi.fn();
vi.mock('../../hooks/usePrevisaoRegiao', () => ({
  usePrevisaoRegiao: (id: string | null) => mockUsePrevisao(id),
}));

/**
 * Instantes SEMPRE com o sufixo Z, como a produção serializa: o Npgsql devolve
 * Kind=Utc e o System.Text.Json escreve o Z. Sem ele o JavaScript lê a string
 * como hora LOCAL, o que em São Paulo desloca toda faixa em 3h, e o teste
 * continuaria verde porque a expectativa teria sido escrita já deslocada.
 *
 * O runner roda em America/Sao_Paulo (fixado em vitest.config.ts), então
 * 18:00Z aparece na tela como 15h. É essa diferença que dá poder de detecção
 * ao teste de leitura em UTC mais abaixo.
 */
function faixa(
  horaUtc: number,
  chuva: number,
  pop = 0.7,
  codigo = 500,
  rajada: number | null = 26,
): FaixaPrevisaoDto {
  return {
    instantePrevisto: `2026-08-17T${String(horaUtc).padStart(2, '0')}:00:00Z`,
    chuvaMm: chuva,
    probabilidadeChuva: pop,
    ventoKmH: 18,
    rajadaKmH: rajada,
    temperaturaC: 20,
    condicaoCodigo: codigo,
    condicaoDescricao: 'chuva moderada',
    coletadoEm: '2026-08-17T12:00:00Z',
  };
}

function comFaixas(faixas: FaixaPrevisaoDto[], erro: string | null = null) {
  mockUsePrevisao.mockReturnValue({ faixas, carregando: false, erro });
}

function destaquesDe(): HTMLElement[] {
  return screen
    .getAllByTestId('faixa-previsao')
    .filter((el) => el.getAttribute('data-destaque') === 'true');
}

describe('PrevisaoFaixa', () => {
  beforeEach(() => {
    mockUsePrevisao.mockReset();
    // Só o relógio é falso. Falsear os timers inteiros atrapalharia o agendamento
    // do React sem necessidade: o componente não usa timer nenhum, só Date.now.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-08-17T12:30:00Z')); // 09:30 em São Paulo
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renderiza um bloco por faixa recebida', () => {
    comFaixas([faixa(15, 2), faixa(18, 14), faixa(21, 3)]);
    render(<PrevisaoFaixa regiaoId="r1" />);

    expect(screen.getAllByTestId('faixa-previsao')).toHaveLength(3);
    expect(screen.getByText('12h')).toBeInTheDocument();
    expect(screen.getByText('15h')).toBeInTheDocument();
    expect(screen.getByText('18h')).toBeInTheDocument();
  });

  it('le o instante como UTC e nao como hora local', () => {
    // 18:00Z em São Paulo é 15h. Se o componente perdesse o Z (parse como hora
    // local) ou cortasse a string, apareceria 18h, e o painel mostraria a chuva
    // três horas fora do lugar sem nenhum sintoma óbvio.
    comFaixas([faixa(18, 4)]);
    render(<PrevisaoFaixa regiaoId="r1" />);

    expect(screen.getByText('15h')).toBeInTheDocument();
    expect(screen.queryByText('18h')).toBeNull();
  });

  it('nao renderiza nada quando nao ha faixa futura', () => {
    comFaixas([]);
    const { container } = render(<PrevisaoFaixa regiaoId="r1" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('nao renderiza nada quando o fetch falha, mesmo com faixa em mao', () => {
    // A faixa vem preenchida de propósito: com a lista vazia, este teste passaria
    // pela guarda de lista vazia e não provaria nada sobre o tratamento do erro.
    comFaixas([faixa(18, 4)], 'Não foi possível carregar a previsão.');
    const { container } = render(<PrevisaoFaixa regiaoId="r1" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('destaca a faixa que cruza o limiar de chuva forte', () => {
    comFaixas([faixa(15, 2, 0.3), faixa(18, 14, 0.82)]);
    render(<PrevisaoFaixa regiaoId="r1" />);

    // O bloco destacado ganha data-destaque="true" para o teste não depender de CSS,
    // que o jsdom não aplica de folha externa.
    const destacados = destaquesDe();
    expect(destacados).toHaveLength(1);
    expect(destacados[0]).toHaveTextContent('15h'); // 18:00Z
  });

  it('nao destaca faixa com chuva alta mas probabilidade baixa', () => {
    comFaixas([faixa(18, 25, 0.3)]);
    render(<PrevisaoFaixa regiaoId="r1" />);

    expect(screen.getAllByTestId('faixa-previsao')[0].getAttribute('data-destaque')).toBe('false');
  });

  it('destaca exatamente em cima dos dois limiares', () => {
    comFaixas([faixa(18, 10, 0.6)]);
    render(<PrevisaoFaixa regiaoId="r1" />);

    expect(destaquesDe()).toHaveLength(1);
  });

  it('nao destaca logo abaixo de qualquer um dos dois limiares', () => {
    // 9.9 mm com probabilidade de sobra, e 10 mm com probabilidade um centésimo
    // abaixo: nenhum dos dois vira push no backend, nenhum vira destaque aqui.
    comFaixas([faixa(15, 9.9, 0.6), faixa(18, 10, 0.59)]);
    render(<PrevisaoFaixa regiaoId="r1" />);

    expect(destaquesDe()).toHaveLength(0);
  });

  it('trata probabilidade como fracao de 0 a 1 e nao como porcentagem', () => {
    // 0.82 é 82%. Um limiar escrito como 60 em vez de 0.6 nunca dispararia, e a
    // faixa que gera push chegaria ao painel sem destaque nenhum.
    comFaixas([faixa(18, 14, 0.82)]);
    render(<PrevisaoFaixa regiaoId="r1" />);

    expect(destaquesDe()).toHaveLength(1);
  });

  it('mostra o aviso de previsao velha quando a coleta passa de 3h', () => {
    const velha = { ...faixa(18, 4), coletadoEm: '2026-08-17T08:00:00Z' }; // 4h30 atrás
    comFaixas([velha]);
    render(<PrevisaoFaixa regiaoId="r1" />);

    // 08:00Z é 05:00 em São Paulo: o aviso também sai no fuso do navegador.
    expect(screen.getByText('previsão de 05:00')).toBeInTheDocument();
  });

  it('nao mostra o aviso quando a coleta e recente', () => {
    comFaixas([faixa(18, 4)]); // coletadoEm 12:00, agora 12:30
    render(<PrevisaoFaixa regiaoId="r1" />);

    expect(screen.queryByText(/previsão de/i)).toBeNull();
  });

  it('coloca a fronteira do aviso exatamente em 3h', () => {
    const limite = { ...faixa(18, 4), coletadoEm: '2026-08-17T09:31:00Z' }; // 2h59
    comFaixas([limite]);
    const { unmount } = render(<PrevisaoFaixa regiaoId="r1" />);
    expect(screen.queryByText(/previsão de/i)).toBeNull();
    unmount();

    const passou = { ...faixa(18, 4), coletadoEm: '2026-08-17T09:29:00Z' }; // 3h01
    comFaixas([passou]);
    render(<PrevisaoFaixa regiaoId="r1" />);
    expect(screen.getByText(/previsão de/i)).toBeInTheDocument();
  });

  it('julga a idade pela coleta mais antiga entre as faixas', () => {
    // Cada número exibido é o pior caso entre as subprefeituras, então pode vir da
    // sub mais atrasada. Uma faixa recém-buscada ao lado de uma velha não compra
    // atualidade para as duas: o aviso sai, e com a hora da coleta velha.
    comFaixas([
      { ...faixa(15, 2), coletadoEm: '2026-08-17T08:00:00Z' }, // 4h30 atrás
      { ...faixa(18, 4), coletadoEm: '2026-08-17T12:00:00Z' }, // 30 min atrás
    ]);
    render(<PrevisaoFaixa regiaoId="r1" />);

    // 08:00Z é 05:00 em São Paulo. Pela coleta mais recente não haveria aviso nenhum.
    expect(screen.getByText('previsão de 05:00')).toBeInTheDocument();
  });

  it('mostra os milimetros de cada faixa', () => {
    comFaixas([faixa(18, 14.2)]);
    render(<PrevisaoFaixa regiaoId="r1" />);

    expect(screen.getByText('14.2 mm')).toBeInTheDocument();
  });

  it('renderiza faixa sem rajada, que a API devolve como null', () => {
    comFaixas([faixa(18, 4, 0.7, 500, null)]);
    render(<PrevisaoFaixa regiaoId="r1" />);

    expect(screen.getByText('15h')).toBeInTheDocument();
    expect(screen.getByText('4.0 mm')).toBeInTheDocument();
  });

  it('rotula o bloco com a descricao da condicao', () => {
    comFaixas([faixa(18, 4)]);
    render(<PrevisaoFaixa regiaoId="r1" />);

    expect(screen.getAllByTestId('faixa-previsao')[0]).toHaveAttribute('title', 'chuva moderada');
  });

  it('anuncia a chuva forte em texto, e nao so na cor da borda', () => {
    // O destaque é vermelho e nada mais. Sem o texto invisível, os dois blocos
    // abaixo chegam idênticos a um leitor de tela: "15h, 2.0 mm" e "18h, 14.0 mm",
    // e o aviso que motiva o push some para quem não enxerga a borda (WCAG 1.4.1).
    comFaixas([faixa(15, 2, 0.3), faixa(18, 14, 0.82)]);
    render(<PrevisaoFaixa regiaoId="r1" />);

    const [fraca, forte] = screen.getAllByTestId('faixa-previsao');
    expect(forte).toHaveTextContent(/chuva forte prevista/i);
    // A faixa fraca precisa continuar sem o aviso: um texto fixo em todo bloco
    // passaria na asserção de cima e não distinguiria nada.
    expect(fraca).not.toHaveTextContent(/chuva forte prevista/i);
  });

  it('leva a condicao ao leitor de tela, que nao alcanca o title', () => {
    // O `title` só vira tooltip no hover do mouse. No celular, que é o uso
    // principal do painel, ele nunca aparece.
    comFaixas([faixa(18, 4)]);
    render(<PrevisaoFaixa regiaoId="r1" />);

    expect(screen.getAllByTestId('faixa-previsao')[0]).toHaveTextContent('chuva moderada');
  });
});
