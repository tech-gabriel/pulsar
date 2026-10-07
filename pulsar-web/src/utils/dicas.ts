import type { DicaDto, FaixaRisco, ScoreDto, TipoPerigo } from '../types';

export interface BlocoDicas { perigo: TipoPerigo; faixa: 'MODERADO' | 'ALTO'; dicas: DicaDto[] }

const MAX_POR_PERIGO = 3;

type PerigoAtivo = { perigo: TipoPerigo; faixa: 'MODERADO' | 'ALTO'; valor: number };
const ativo = (p: { faixa: FaixaRisco }): p is PerigoAtivo => p.faixa === 'MODERADO' || p.faixa === 'ALTO';

/**
 * Dicas do catálogo para cada perigo em Atenção ou Alerta, o principal primeiro e os outros
 * pelo valor do componente. Score de antes do S1 (sem componentes) cai no perigo principal
 * com a faixa geral. Perigo sem dica no catálogo não gera bloco.
 */
export function blocosDeDicas(score: ScoreDto | null | undefined, catalogo: DicaDto[]): BlocoDicas[] {
  if (!score || catalogo.length === 0) return [];
  const c = score.componentes;
  const perigos: { perigo: TipoPerigo; faixa: FaixaRisco; valor: number }[] = c
    ? [
        { perigo: 'ALAGAMENTO', faixa: c.alagamento.faixa, valor: c.alagamento.valor },
        { perigo: 'VENTO', faixa: c.vento.faixa, valor: c.vento.valor },
        { perigo: 'CALOR', faixa: c.calor.faixa, valor: c.calor.valor },
      ]
    : [{ perigo: score.perigoPrincipal ?? 'ALAGAMENTO', faixa: score.faixa, valor: score.valor }];
  const principal = (p: PerigoAtivo) => Number(p.perigo === score.perigoPrincipal);

  return perigos
    .filter(ativo)
    .sort((a, b) => principal(b) - principal(a) || b.valor - a.valor)
    .map((p) => ({
      perigo: p.perigo,
      faixa: p.faixa,
      dicas: catalogo
        .filter((d) => d.categoria === p.perigo && d.faixa === p.faixa)
        .sort((a, b) => a.ordem - b.ordem)
        .slice(0, MAX_POR_PERIGO),
    }))
    .filter((b) => b.dicas.length > 0);
}
