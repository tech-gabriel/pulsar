export type FaixaRisco = 'BAIXO' | 'MODERADO' | 'ALTO';

export interface UsuarioDto {
  id: string;
  nome: string;
  email: string;
}

export interface LoginRequestDto {
  email: string;
  senha: string;
}

export interface CadastroRequestDto {
  nome: string;
  email: string;
  senha: string;
}

export interface LoginResponseDto {
  token: string;
  usuario: UsuarioDto;
}

export interface LeituraDto {
  id: string;
  timestamp: string;
  chuvaMmH: number;
  ventoKmH: number;
  visibilidadeKm: number;
  indiceUv: number;
}

export interface SubprefeituraDto {
  id: string;
  nome: string;
  sigla: string;
  latitude: number;
  longitude: number;
  scoreAtual: number | null;
  faixaRisco: FaixaRisco | null;
  ultimaLeitura: LeituraDto | null;
}

export interface RegiaoDto {
  id: string;
  nome: string;
  scoreAtual: number | null;
  faixaRisco: FaixaRisco | null;
  subprefeituras: SubprefeituraDto[];
}

export interface ScoreDto {
  id: string;
  valor: number;
  faixa: FaixaRisco;
  timestamp: string;
}

export interface AlertaDto {
  id: string;
  regiaoId: string;
  regiaoNome: string;
  mensagem: string;
  faixaRisco: FaixaRisco;
  criadoEm: string;
}

export interface LeituraComScoreDto {
  timestamp: string;
  chuvaMmH: number;
  ventoKmH: number;
  visibilidadeKm: number;
  indiceUv: number;
  score: number | null;
  faixaRisco: FaixaRisco | null;
}

export interface HistoricoDto {
  subprefeituraId: string;
  subprefeituranome: string;
  leituras: LeituraComScoreDto[];
}

export interface FavoritoDto {
  regiaoId: string;
  regiaoNome: string;
  scoreAtual: number | null;
  faixaRisco: FaixaRisco | null;
}
