import type { FaixaRisco, SubprefeituraMapaDto, TipoPerigo } from '../../types';
import { normalizarNome } from '../../utils/texto';

/** Área da cidade (hoje, a subprefeitura de SP). */
export type Area = SubprefeituraMapaDto;

export interface ResumoCidade {
  alto: number;
  moderado: number;
  baixo: number;
  /** Pior área COM nota; null sem dados. */
  pior: Area | null;
  /** Nenhuma área com nota: não é "tranquilo", é "sem dados". */
  semDados: boolean;
}

const nota = (a: Area): number | null => a.scoreAtual?.valor ?? null;

/** Pior nota primeiro; empate em ordem alfabética pt-BR; sem nota por último. */
export function ordenarPorRisco(areas: Area[]): Area[] {
  return [...areas].sort((a, b) => {
    const na = nota(a);
    const nb = nota(b);
    if (na === null && nb !== null) return 1;
    if (nb === null && na !== null) return -1;
    if (na !== null && nb !== null && na !== nb) return nb - na;
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });
}

export function resumoCidade(areas: Area[]): ResumoCidade {
  const conta = (f: FaixaRisco) => areas.filter((a) => a.faixaRisco === f).length;
  const comNota = areas.filter((a) => nota(a) !== null);
  return {
    alto: conta('ALTO'),
    moderado: conta('MODERADO'),
    baixo: conta('BAIXO'),
    pior: comNota.length > 0 ? ordenarPorRisco(comNota)[0] : null,
    semDados: comNota.length === 0,
  };
}

/** Moderado e alto, pior primeiro: a seção "Em atenção agora". */
export function emAtencao(areas: Area[]): Area[] {
  return ordenarPorRisco(areas).filter((a) => a.faixaRisco === 'ALTO' || a.faixaRisco === 'MODERADO');
}

/**
 * Sino pessoal primeiro (SP3): o número conta as SUAS em alto, o mesmo critério do push.
 * A cidade aparece como contexto ("Na cidade") sem acender o sino. Sem favoritas, o
 * número volta a ser o total da cidade, para o sino não ficar mudo.
 */
export function alertasDoSino(areas: Area[], favoritasIds: string[]): { contagem: number; suas: Area[]; naCidade: Area[] } {
  const fav = new Set(favoritasIds);
  const atencao = emAtencao(areas);
  const suas = atencao.filter((a) => fav.has(a.id));
  const naCidade = atencao.filter((a) => !fav.has(a.id) && a.faixaRisco === 'ALTO');
  const contagem = fav.size > 0 ? suas.filter((a) => a.faixaRisco === 'ALTO').length : naCidade.length;
  return { contagem, suas, naCidade };
}

/** Busca por nome sem acento; termo vazio não lista nada. */
export function buscarAreas(termo: string, areas: Area[]): Area[] {
  const q = normalizarNome(termo);
  if (!q) return [];
  return areas
    .filter((a) => normalizarNome(a.nome).includes(q))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

const ROTULO_PERIGO: Record<TipoPerigo, string> = { ALAGAMENTO: 'alagamento', VENTO: 'vento', CALOR: 'calor' };

/** "alagamento"/"vento"/"calor", só quando há risco (em BAIXO o maior perigo é ruído). */
export function rotuloPerigo(area: Area): string | null {
  if (area.faixaRisco === 'BAIXO') return null;
  return ROTULO_PERIGO[area.scoreAtual?.perigoPrincipal ?? 'ALAGAMENTO'];
}
