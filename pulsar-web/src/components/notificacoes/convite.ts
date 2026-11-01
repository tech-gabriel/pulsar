import { labelFaixa } from '../../utils/risco';
import type { Area } from '../../features/cidade/areas';
import type { FaixaRisco } from '../../types';

/** Chuva forte prevista numa favorita: de onde e quando ("amanhã às 12h"). */
export interface ChuvaForteFavorita {
  area: Pick<Area, 'id' | 'nome'>;
  quando: string;
  mm: number;
}

export interface Convite {
  /** 'pessoal' (A, todo dia) ou 'motivo' (B, quando há razão concreta para ativar agora). */
  variante: 'pessoal' | 'motivo';
  /** Identifica o motivo: dispensar um motivo não esconde o próximo, que é outra razão. */
  chave: string;
  icone: 'sino' | 'chuva' | 'risco';
  titulo: string;
  /** Título do celular, que tem uma linha só (o lugar vai para a linha de baixo). */
  tituloCurto: string;
  texto: string;
  /** Linha curta do celular. */
  textoCurto: string;
  botao: string;
  /** Faixa da favorita em risco, para o ícone usar a cor dela. */
  faixa?: FaixaRisco;
}

const PESO = { ALTO: 2, MODERADO: 1, BAIXO: 0 } as const;

function nomes(favoritas: Pick<Area, 'nome'>[]): string {
  const n = favoritas.map((f) => f.nome);
  if (n.length <= 1) return n[0] ?? 'sua subprefeitura';
  if (n.length === 2) return `${n[0]} e ${n[1]}`;
  return `${n[0]}, ${n[1]} e mais ${n.length - 2}`;
}

/**
 * Qual convite mostrar. Com motivo concreto (favorita em risco agora, ou chuva forte prevista
 * numa favorita) o convite diz o motivo e pede uma coisa próxima ("Me avise"): é o pico de
 * motivação (Fogg). Sem motivo, o convite fala das favoritas pelo nome e promete silêncio no
 * resto do tempo, que é o medo que segura o clique.
 */
export function escolherConvite(favoritas: Area[], chuva: ChuvaForteFavorita | null): Convite {
  const emRisco = favoritas
    .filter((f) => f.faixaRisco === 'MODERADO' || f.faixaRisco === 'ALTO')
    .sort((a, b) => PESO[b.faixaRisco!] - PESO[a.faixaRisco!])[0];

  if (emRisco) {
    const faixa = labelFaixa(emRisco.faixaRisco);
    return {
      variante: 'motivo', chave: `risco:${emRisco.id}:${emRisco.faixaRisco}`, icone: 'risco',
      titulo: `${faixa} agora em ${emRisco.nome}`,
      tituloCurto: `${faixa} agora em ${emRisco.nome}`,
      texto: 'Quer o aviso no celular da próxima vez, antes de abrir o app?',
      textoCurto: 'Quer o aviso no celular da próxima vez?',
      botao: 'Me avise',
      faixa: emRisco.faixaRisco ?? undefined,
    };
  }

  if (chuva) {
    const mm = chuva.mm.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    return {
      variante: 'motivo', chave: `chuva:${chuva.area.id}:${chuva.quando}`, icone: 'chuva',
      titulo: `Chuva forte ${chuva.quando} em ${chuva.area.nome}`,
      tituloCurto: `Chuva forte ${chuva.quando}`,
      texto: `${mm} mm previstos. Quer o aviso no celular antes de começar?`,
      textoCurto: `em ${chuva.area.nome}. Quer o aviso antes?`,
      botao: 'Me avise',
    };
  }

  const uma = favoritas.length <= 1;
  return {
    variante: 'pessoal', chave: 'pessoal', icone: 'sino',
    titulo: `Alertas de ${nomes(favoritas)}`,
    tituloCurto: `Alertas de ${nomes(favoritas)}`,
    texto: `Avisamos no celular quando ${uma ? 'ela entrar' : favoritas.length === 2 ? 'uma das duas entrar' : 'uma delas entrar'} em Atenção ou Alerta. Fora isso, silêncio.`,
    textoCurto: `Só quando ${uma ? 'ela entrar' : 'uma delas entrar'} em risco`,
    botao: 'Ativar alertas',
  };
}
