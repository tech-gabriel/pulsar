import type { SubprefeituraDto } from '../types';

// O backend não expõe o catálogo de sugestões via REST, então derivamos as
// recomendações de segurança a partir das piores condições atuais da região
// (ETAPA 4.5). Cada sugestão tem uma categoria que define o ícone exibido.

export type CategoriaSugestao = 'chuva' | 'vento' | 'visibilidade' | 'uv';

export interface Sugestao {
  categoria: CategoriaSugestao;
  titulo: string;
  descricao: string;
}

interface Piores {
  chuva: number;
  vento: number;
  visibilidade: number;
  uv: number;
}

// Agrega as condições mais severas entre as subprefeituras da região.
function pioresCondicoes(subs: SubprefeituraDto[]): Piores {
  const piores: Piores = { chuva: 0, vento: 0, visibilidade: Infinity, uv: 0 };
  for (const sub of subs) {
    const l = sub.ultimaLeitura;
    if (!l) continue;
    piores.chuva = Math.max(piores.chuva, l.chuvaMmH);
    piores.vento = Math.max(piores.vento, l.ventoKmH);
    piores.visibilidade = Math.min(piores.visibilidade, l.visibilidadeKm);
    piores.uv = Math.max(piores.uv, l.indiceUv);
  }
  if (!Number.isFinite(piores.visibilidade)) piores.visibilidade = 10;
  return piores;
}

/**
 * Gera as sugestões de segurança relevantes para a região conforme as
 * condições atuais. Pode retornar lista vazia se nada estiver acima do limite.
 */
export function gerarSugestoes(subs: SubprefeituraDto[]): Sugestao[] {
  const p = pioresCondicoes(subs);
  const lista: Sugestao[] = [];

  if (p.chuva > 5) {
    lista.push({
      categoria: 'chuva',
      titulo: 'Risco de alagamentos',
      descricao: 'Evite áreas baixas e margens de córregos. Não atravesse ruas alagadas a pé ou de carro.',
    });
  }
  if (p.vento > 40) {
    lista.push({
      categoria: 'vento',
      titulo: 'Ventos fortes',
      descricao: 'Afaste-se de árvores, placas e estruturas instáveis. Recolha objetos soltos em sacadas.',
    });
  }
  if (p.visibilidade < 2) {
    lista.push({
      categoria: 'visibilidade',
      titulo: 'Visibilidade reduzida',
      descricao: 'Reduza a velocidade e use faróis baixos. Redobre a atenção em cruzamentos.',
    });
  }
  if (p.uv >= 8) {
    lista.push({
      categoria: 'uv',
      titulo: 'Índice UV muito alto',
      descricao: 'Use protetor solar e evite exposição direta entre 10h e 16h.',
    });
  }

  return lista;
}
