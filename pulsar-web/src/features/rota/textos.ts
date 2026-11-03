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

// Horário de "tranquilo até" muito à frente é o fim do horizonte da previsão, não uma promessa útil.
const MAX_HORAS_A_FRENTE = 6;

export function textoVeredito(r: RotaAvaliacao, fuso?: string, agora: number = Date.now()): { titulo: string; detalhe: string } {
  const trecho = trechoEm(r);
  const em = trecho ? emNomeDe(trecho.nome) : 'no caminho';
  const hora = (utc: string | null) => (utc ? rotuloHora(utc, fuso) : null);

  switch (r.estado) {
    case 'PodeIr': {
      const perto = r.tranquiloAteUtc && new Date(r.tranquiloAteUtc).getTime() - agora <= MAX_HORAS_A_FRENTE * 3_600_000;
      const h = perto ? hora(r.tranquiloAteUtc) : null;
      return {
        titulo: 'Pode ir: caminho tranquilo',
        detalhe: h ? `Sem chuva forte prevista no trajeto até umas ${h}.` : 'Sem chuva forte prevista no trajeto agora.',
      };
    }
    case 'ComAtencao': {
      // O backend não manda hora no "com atenção": vale a 1ª hora BAIXO depois da 1ª que não é.
      const primeira = r.horas.findIndex((x) => x.piorFaixa !== 'BAIXO');
      const volta = primeira < 0 ? undefined : r.horas.slice(primeira).find((x) => x.piorFaixa === 'BAIXO');
      const h = volta ? rotuloHora(volta.inicioUtc, fuso) : null;
      return { titulo: 'Pode ir, com atenção', detalhe: `Fique de olho ${em}${h ? ` até umas ${h}` : ''}.` };
    }
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
