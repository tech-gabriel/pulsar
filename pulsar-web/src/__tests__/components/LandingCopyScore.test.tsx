import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LandingFaq from '../../components/landing/LandingFaq';
import LandingConfianca from '../../components/landing/LandingConfianca';
import LandingComoFunciona from '../../components/landing/LandingComoFunciona';
import { ThemeContext } from '../../hooks/useTheme';
import { CENAS } from '../../data/landing-narrativa';

// A landing não pode descrever a fórmula antiga (chuva 35%, vento 30%, neblina 20%, UV 15%)
// depois que o score passou a medir três perigos (release 1.10.0).
describe('copy da landing sobre o score', () => {
  it('FAQ explica os três perigos e não cita os pesos antigos', () => {
    const { container } = render(<LandingFaq />);
    fireEvent.click(screen.getByRole('button', { name: /como .*calculad/i }));
    fireEvent.click(screen.getByRole('button', { name: /o que é o score de perigo/i }));
    const texto = container.textContent ?? '';
    expect(texto).toMatch(/alagamento, vento forte e calor extremo/);
    expect(texto).toMatch(/Até 30 é Tranquilo, até 60 Atenção e acima disso, Alerta\./);
    expect(texto).not.toMatch(/risco baixo|até 60 moderado/);
    expect(texto).not.toMatch(/35%|índice UV \(15%\)|visibilidade\/neblina/);
  });

  it('nenhum bloco fala em pesos fixos por fator', () => {
    const { container } = render(<LandingConfianca />);
    expect(container.textContent).not.toMatch(/pesos definidos/);
    expect(CENAS.find((c) => c.id === 'score')!.texto).not.toMatch(/pesos/);
  });

  it('como funciona usa as faixas novas e avisa que é estimativa', () => {
    const { container } = render(
      <ThemeContext.Provider value={{ theme: 'dark', toggleTheme: () => {} }}><LandingComoFunciona /></ThemeContext.Provider>,
    );
    expect(container.textContent).toMatch(/Tranquilo, Atenção ou Alerta/);
    expect(container.textContent).toMatch(/Estimativa do Pulsar\. Em emergência, ligue 199 \(Defesa Civil\) ou 193 \(Bombeiros\)\./);
  });
});
