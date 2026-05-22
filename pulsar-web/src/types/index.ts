export type FaixaRisco = 'BAIXO' | 'MODERADO' | 'ALTO';

// ── Auth ─────────────────────────────────────────────────────────────────────

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

// ── Score / Leitura ───────────────────────────────────────────────────────────

export interface ScoreDto {
  valor: number;
  faixa: FaixaRisco;
  timestamp: string;
}

export interface LeituraDto {
  chuvaMmH: number;
  ventoKmH: number;
  visibilidadeKm: number;
  indiceUv: number;
  timestamp: string;
}

// ── Região ────────────────────────────────────────────────────────────────────

/** Retornado por GET /api/regioes (lista resumida) */
export interface RegiaoDto {
  id: string;
  nome: string;
  scoreAgregado: number;
  faixaRisco: FaixaRisco;
  totalSubprefeituras: number;
  ultimaAtualizacao: string;
}

/** Retornado por GET /api/regioes/{id} (detalhe completo) */
export interface RegiaoDetalheDto extends RegiaoDto {
  subprefeituras: SubprefeituraDto[];
}

// ── Subprefeitura ─────────────────────────────────────────────────────────────

export interface SubprefeituraDto {
  id: string;
  nome: string;
  latitude: number;
  longitude: number;
  scoreAtual: ScoreDto | null;
  faixaRisco: FaixaRisco;
  ultimaLeitura: LeituraDto | null;
}

// ── Histórico ─────────────────────────────────────────────────────────────────

export interface LeituraComScoreDto {
  chuvaMmH: number;
  ventoKmH: number;
  visibilidadeKm: number;
  indiceUv: number;
  timestamp: string;
  score: ScoreDto | null;
}

export interface HistoricoDto {
  subprefeituraNome: string;
  leituras: LeituraComScoreDto[];
}

// ── Favoritos ─────────────────────────────────────────────────────────────────

export interface FavoritoDto {
  regiaoId: string;
  regiaoNome: string;
}

export interface AdicionarFavoritoRequestDto {
  regiaoId: string;
}
