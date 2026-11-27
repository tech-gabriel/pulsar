import { emNomeDe } from '../../data/regioes-seo';
import type { FaixaRisco } from '../../types';
import type { RotaAvaliacao, TrechoRota } from './tipos';

const PIOR: Record<FaixaRisco, number> = { BAIXO: 0, MODERADO: 1, ALTO: 2 };

/** "18h" no fuso dado (padrão: o do navegador; o backend é UTC). */
export function rotuloHora(utc: string, fuso?: string): string {
  const h = new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hourCycle: 'h23', timeZone: fuso }).format(new Date(utc));
  return `${Number(h)}h`;
}

// O DTO só traz a faixa geral, então o texto não diz "chuva" nem "alagamento"
// a menos que o CGE tenha confirmado.
function trechoEm(r: RotaAvaliacao): TrechoRota | undefined {
  const decisivo = r.trechos.find((t) => t.subprefeituraId === r.trechoDecisivoId);
  if (decisivo) return decisivo;
  let pior: TrechoRota | undefined;
  for (const t of r.trechos) {
    const p = t.faixa ? PIOR[t.faixa] : -1;
    if (!pior || p > (pior.faixa ? PIOR[pior.faixa] : -1)) pior = t;
  }
  return pior;
}

// Só a chuva medida agora decide (16/11/2026): "pode ir" e "com atenção" não citam hora prevista.
// A previsão só aparece no "esperar até".
export function textoVeredito(r: RotaAvaliacao, fuso?: string, atravessaSerra = false): { titulo: string; detalhe: string } {
  const trecho = trechoEm(r);
  const em = trecho ? emNomeDe(trecho.nome) : 'no caminho';
  const hora = (utc: string | null) => (utc ? rotuloHora(utc, fuso) : null);

  switch (r.estado) {
    case 'PodeIr':
      // Entre cidades só as pontas são avaliadas: a frase não promete o caminho todo (a serra fica de fora).
      return { titulo: 'Pode ir: caminho tranquilo', detalhe: atravessaSerra ? 'Sem chuva forte medida na saída e na chegada agora.' : 'Sem chuva forte medida no caminho agora.' };
    case 'ComAtencao':
      return { titulo: 'Pode ir, com atenção', detalhe: `Está chovendo ${em}. Fique de olho.` };
    case 'Esperar': {
      const h = hora(r.esperarAteUtc);
      const cge = r.trechos.find((t) => t.subprefeituraId === r.trechoDecisivoId)?.alagandoCge;
      const base = cge ? `Alagando agora ${em}, segundo o CGE.` : `Risco alto ${em}.`;
      return {
        titulo: h ? `Melhor esperar até umas ${h}` : 'Melhor esperar',
        detalhe: h ? base : `${base} Ainda não dá para saber quando melhora.`,
      };
    }
    default:
      return { titulo: 'Sem leitura recente no caminho', detalhe: `Não temos dado recente ${em}. Confira antes de sair.` };
  }
}

/** Rota entre a capital e a Baixada: a serra não tem trecho nem medida (desenho de 17/11/2026). */
export const TEXTO_SERRA = 'A serra não é avaliada: confira a Ecovias antes de descer';

/**
 * O texto da serra pelo sentido (decisão do user, 18/11/2026): descendo ou subindo pela Ecovias
 * (Anchieta e Imigrantes, o caminho até a Baixada a partir de qualquer ponta da capital); com
 * Bertioga numa das pontas a estrada é a Mogi-Bertioga, fora da Ecovias.
 */
export function textoSerra(desce: boolean, bertioga: boolean): string {
  if (bertioga) return 'A serra não é avaliada: confira as condições da estrada antes de ir';
  return desce ? TEXTO_SERRA : 'A serra não é avaliada: confira a Ecovias antes de subir';
}
