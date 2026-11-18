import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AvisosOficiais, { LinhaAvisoOficial } from '../../../components/painel/AvisosOficiais';
import type { AlertaOficial } from '../../../types';

const alerta = (o: Partial<AlertaOficial>): AlertaOficial => ({
  identificador: '1/2026', evento: 'CHUVAS INTENSAS', gravidade: 'Moderate', emissor: 'Defesa Civil Estadual De São Paulo',
  titulo: 'Defesa Civil:12h47 Chuva isolada na regiao. Tenha cuidado!',
  descricao: '12h47 Chuva isolada na região de Santo Antônio do Aracanguá. Tem raios. Tenha cuidado!',
  instrucao: 'Siga as orientações da defesa civil local. Em caso de emergência, ligue 199 ou 193.',
  inicioUtc: '2026-11-18T15:47:00Z', expiraUtc: '2026-11-18T17:50:00Z', ...o,
});

describe('AvisosOficiais', () => {
  it('some sem alertas (e sem o campo, como no snapshot do SSG)', () => {
    expect(render(<AvisosOficiais alertas={[]} />).container).toBeEmptyDOMElement();
    expect(render(<AvisosOficiais alertas={undefined} />).container).toBeEmptyDOMElement();
    expect(render(<LinhaAvisoOficial alertas={undefined} />).container).toBeEmptyDOMElement();
  });

  // Cartão limpo: uma linha por alerta, mais grave primeiro, com quem emitiu e o nível na cor oficial.
  it('lista do mais grave para o mais leve, com o emissor curto e o nível', () => {
    render(<AvisosOficiais alertas={[
      alerta({ identificador: 'a', gravidade: 'Moderate' }),
      alerta({ identificador: 'b', gravidade: 'Extreme', evento: 'VENDAVAL' }),
    ]} />);
    const linhas = screen.getAllByRole('button');
    expect(linhas[0]).toHaveTextContent(/^VendavalDefesa Civil de SP · até \d\d:\d\dVermelho$/);
    expect(linhas[1]).toHaveTextContent(/^Chuvas intensas.*Amarelo$/);
    expect(screen.getByText('Vermelho')).toHaveClass('dc-selo', 'dc-vermelho');
    // O texto completo não suja o cartão: só aparece na folha.
    expect(screen.queryByText(/Santo Antônio do Aracanguá/)).not.toBeInTheDocument();
  });

  // O alerta completo, com o texto exatamente como a Defesa Civil mandou e a orientação oficial.
  it('o toque abre a folha com o texto como veio, a orientação e a fonte', () => {
    render(<AvisosOficiais alertas={[alerta({})]} />);
    fireEvent.click(screen.getByRole('button', { name: /Ler o alerta completo/ }));

    const folha = screen.getByRole('dialog');
    expect(folha).toHaveTextContent('12h47 Chuva isolada na região de Santo Antônio do Aracanguá. Tem raios. Tenha cuidado!');
    expect(folha).toHaveTextContent('Em caso de emergência, ligue 199 ou 193.');
    expect(folha).toHaveTextContent(/Defesa Civil Estadual de São Paulo · de \d\d:\d\d até \d\d:\d\d/);
    expect(screen.getByRole('heading', { name: 'Chuvas intensas' })).toBeInTheDocument();
  });

  it('a linha da folha curta resume o alerta mais grave', () => {
    render(<LinhaAvisoOficial alertas={[alerta({ gravidade: 'Moderate' }), alerta({ identificador: 'x', gravidade: 'Severe' })]} />);
    expect(screen.getByText(/^Defesa Civil: chuvas intensas até \d\d:\d\d$/)).toBeInTheDocument();
    expect(screen.getByText('Laranja')).toHaveClass('dc-laranja');
  });

  // O leitor de tela ouve o mesmo que a tela mostra, inclusive até quando o alerta vale.
  it('o nome acessível da linha diz até quando o alerta vale', () => {
    render(<AvisosOficiais alertas={[alerta({})]} />);
    expect(screen.getByRole('button', { name: /Ler o alerta completo/ }).getAttribute('aria-label')).toMatch(/até \d\d:\d\d/);
  });
});
