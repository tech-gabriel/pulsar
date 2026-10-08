import { describe, it, expect } from 'vitest';
import { dadosDoCard } from '../../../features/compartilhar/dadosDoCard';
import type { Area } from '../../../features/cidade/areas';
import type { DicaDto, FaixaRisco, TipoPerigo } from '../../../types';

const AGORA = new Date(2026, 9, 7, 18, 0); // 07/10 18h no fuso local do teste
const QUANDO = new Date(2026, 9, 7, 17, 40).toISOString();

const dica = (categoria: TipoPerigo, faixa: FaixaRisco, ordem: number, titulo: string): DicaDto =>
  ({ id: titulo, categoria, faixa, ordem, titulo, descricao: `${titulo} descrição` });
const CATALOGO = [
  dica('ALAGAMENTO', 'ALTO', 2, 'Procure um lugar alto'),
  dica('ALAGAMENTO', 'ALTO', 1, 'Não atravesse água'),
  dica('CALOR', 'MODERADO', 1, 'Beba água o dia todo'),
];

const area = (o: {
  nome?: string; zona?: string; faixa?: FaixaRisco; perigo?: TipoPerigo; chuva3h?: number;
  vento?: number; sensacao?: number; semLeitura?: boolean; semScore?: boolean; quando?: string;
} = {}): Area => {
  const faixa = o.faixa ?? 'ALTO';
  return {
    id: 's1', nome: o.nome ?? 'Mooca', zona: o.zona ?? 'Leste', latitude: 0, longitude: 0, faixaRisco: faixa,
    scoreAtual: o.semScore ? null : {
      valor: 70, faixa, timestamp: o.quando ?? QUANDO, perigoPrincipal: o.perigo ?? 'ALAGAMENTO',
      chuva3hMm: o.chuva3h ?? 22, chuva48hMm: 30,
    },
    ultimaLeitura: o.semLeitura ? null : {
      chuvaMmH: 6, ventoKmH: o.vento ?? 45.4, visibilidadeKm: 10, indiceUv: 2, temperaturaC: 31,
      sensacaoTermica: o.sensacao ?? 34.2, umidade: 80, timestamp: QUANDO,
    },
  } as unknown as Area;
};

describe('dadosDoCard', () => {
  it('Alerta de alagamento: faixa, perigo, dado, dica de menor ordem, texto e link', () => {
    const d = dadosDoCard(area(), CATALOGO, AGORA);
    expect(d).toMatchObject({
      slug: 'mooca', idArea: 'mooca', nome: 'Mooca', legenda: 'ZONA LESTE · SÃO PAULO',
      faixa: 'ALTO', rotuloFaixa: 'ALERTA', perigo: 'Alagamento', dado: '22 mm de chuva em 3 h',
      caixa: { rotulo: 'O QUE FAZER AGORA', titulo: 'Não atravesse água', texto: 'Não atravesse água descrição' },
      horario: 'HOJE · 17H40', link: 'https://app-pulsar.com.br/cadastro?regiao=mooca',
    });
    // Uma ideia por linha: no WhatsApp a mensagem chega limpa e o link fica sozinho na última.
    expect(d.texto).toBe('Mooca agora: Alerta de alagamento\nVeja o risco da sua subprefeitura no Pulsar:\nhttps://app-pulsar.com.br/cadastro?regiao=mooca');
  });

  it('chuva com decimal usa vírgula; sem chuva em 3 h, frase de condição', () => {
    expect(dadosDoCard(area({ chuva3h: 6.5 }), CATALOGO, AGORA).dado).toBe('6,5 mm de chuva em 3 h');
    expect(dadosDoCard(area({ chuva3h: 0 }), CATALOGO, AGORA).dado).toBe('Condições de risco de alagamento');
  });

  it('vento e calor: dado da leitura e fallback sem leitura', () => {
    expect(dadosDoCard(area({ perigo: 'VENTO' }), CATALOGO, AGORA).dado).toBe('Ventos de 45 km/h');
    expect(dadosDoCard(area({ perigo: 'VENTO', semLeitura: true }), CATALOGO, AGORA).dado).toBe('Ventos fortes agora');
    expect(dadosDoCard(area({ perigo: 'CALOR', faixa: 'MODERADO' }), CATALOGO, AGORA)).toMatchObject({
      perigo: 'Calor', dado: 'Sensação de 34 °C', rotuloFaixa: 'ATENÇÃO', caixa: { titulo: 'Beba água o dia todo' },
    });
    expect(dadosDoCard(area({ perigo: 'CALOR', semLeitura: true }), CATALOGO, AGORA).dado).toBe('Calor forte agora');
  });

  it('Tranquilo: sem perigo, frase de calma, "Fique avisado" com artigo e texto próprio', () => {
    const d = dadosDoCard(area({ faixa: 'BAIXO' }), CATALOGO, AGORA);
    expect(d).toMatchObject({
      perigo: null, rotuloFaixa: 'TRANQUILO', dado: 'Sem risco de chuva forte, vento ou calor agora',
      caixa: { rotulo: 'FIQUE AVISADO', titulo: 'Saiba antes que a água chegue',
        texto: 'O Pulsar avisa no seu celular quando a Mooca entrar em Atenção ou Alerta. De graça.' },
    });
    expect(d.texto).toBe('Mooca agora: Tranquilo\nSaiba antes que a água chegue:\nhttps://app-pulsar.com.br/cadastro?regiao=mooca');
  });

  it('artigo: "o Butantã"; sem preposição conhecida, só o nome', () => {
    expect(dadosDoCard(area({ nome: 'Butantã', faixa: 'BAIXO' }), [], AGORA).caixa.texto).toContain('quando o Butantã entrar');
    expect(dadosDoCard(area({ nome: 'Itaquera', faixa: 'BAIXO' }), [], AGORA).caixa.texto).toContain('quando Itaquera entrar');
  });

  it('Alerta com catálogo vazio ou sem dica do perigo cai no "Fique avisado"', () => {
    expect(dadosDoCard(area(), [], AGORA).caixa.rotulo).toBe('FIQUE AVISADO');
    expect(dadosDoCard(area({ perigo: 'VENTO' }), CATALOGO, AGORA).caixa.rotulo).toBe('FIQUE AVISADO');
  });

  it('leitura de outro dia mostra a data; sem score usa a hora de agora', () => {
    const ontem = new Date(2026, 9, 6, 21, 5).toISOString();
    expect(dadosDoCard(area({ quando: ontem }), CATALOGO, AGORA).horario).toBe('06/10 · 21H05');
    expect(dadosDoCard(area({ semScore: true }), CATALOGO, AGORA)).toMatchObject({ horario: 'HOJE · 18H00', rotuloFaixa: 'TRANQUILO', perigo: null });
  });

  it("slug e id do mapa com apóstrofo (M'Boi Mirim) e texto sem travessão", () => {
    const d = dadosDoCard(area({ nome: "M'Boi Mirim", zona: 'Sul' }), CATALOGO, AGORA);
    expect(d.slug).toBe('mboi-mirim');
    expect(d.link).toBe('https://app-pulsar.com.br/cadastro?regiao=mboi-mirim');
    expect(d.texto + d.dado + d.caixa.texto).not.toMatch(/[—–]/);
  });
});
