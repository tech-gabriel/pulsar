import { User, Car, Bike, ShieldCheck, type LucideIcon } from 'lucide-react';
import type { TipoPerfil } from '../types';

export interface PerfilMeta {
  valor: TipoPerfil;
  label: string;
  descricao: string;
  Icon: LucideIcon;
  cor: string;
}

/** Catálogo das personas selecionáveis. A ordem define a exibição na UI. */
export const PERFIS: PerfilMeta[] = [
  {
    valor: 'CIDADAO',
    label: 'Cidadão',
    descricao: 'Visão geral do risco na sua região',
    Icon: User,
    cor: '#00BCFF',
  },
  {
    valor: 'MOTORISTA',
    label: 'Motorista',
    descricao: 'Foco em vias, visibilidade e vento',
    Icon: Car,
    cor: '#f59e0b',
  },
  {
    valor: 'CICLISTA',
    label: 'Ciclista / Pedestre',
    descricao: 'Foco em chuva, vento e UV ao ar livre',
    Icon: Bike,
    cor: '#22c55e',
  },
  {
    valor: 'DEFESA_CIVIL',
    label: 'Defesa Civil',
    descricao: 'Acompanhamento operacional de alertas',
    Icon: ShieldCheck,
    cor: '#ef4444',
  },
];

export function perfilMeta(valor: TipoPerfil | undefined | null): PerfilMeta {
  return PERFIS.find((p) => p.valor === valor) ?? PERFIS[0];
}
