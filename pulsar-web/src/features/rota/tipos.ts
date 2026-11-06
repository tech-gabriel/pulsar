import type { FaixaRisco } from '../../types';

// Espelho do RotaAvaliacaoDto da API (POST /api/rota/avaliar).
export type EstadoRota = 'PodeIr' | 'ComAtencao' | 'Esperar' | 'SemDado';

export interface TrechoRota {
  subprefeituraId: string;
  nome: string;
  /** Faixa geral da subprefeitura; null = sem dado recente. */
  faixa: FaixaRisco | null;
  alagandoCge: boolean;
}

export interface HoraRota {
  inicioUtc: string;
  piorFaixa: FaixaRisco;
}

export interface RotaAvaliacao {
  estado: EstadoRota;
  trechoDecisivoId: string | null;
  tranquiloAteUtc: string | null;
  esperarAteUtc: string | null;
  trechos: TrechoRota[];
  horas: HoraRota[];
}

export interface PontoRota {
  lat: number;
  lon: number;
  rotulo: string;
  /** Só o resultado do geocoder recebe; ausente = GPS, subprefeitura ou local salvo. */
  fonte?: 'endereco';
}
