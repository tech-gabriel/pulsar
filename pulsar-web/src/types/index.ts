export type FaixaRisco = 'BAIXO' | 'MODERADO' | 'ALTO';

export type TipoPerfil = 'CIDADAO' | 'MOTORISTA' | 'CICLISTA' | 'DEFESA_CIVIL';

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface UsuarioDto {
  id: string;
  nome: string;
  email: string;
  perfil: TipoPerfil;
}

export interface LoginRequestDto {
  email: string;
  senha: string;
}

export interface CadastroRequestDto {
  nome: string;
  email: string;
  senha: string;
  perfil?: TipoPerfil;
}

export interface AtualizarPerfilRequestDto {
  nome: string;
  email: string;
  perfil: TipoPerfil;
  senhaAtual?: string;
  novaSenha?: string;
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
  temperaturaC: number;
  sensacaoTermica: number;
  umidade: number;
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
  temperaturaAtual: number;
  ultimaLeitura: LeituraDto | null;
}

/** SubprefeituraDto achatada com a região a que pertence — usada nos labels do mapa. */
export interface SubprefeituraMapaDto extends SubprefeituraDto {
  regiaoId: string;
  regiaoNome: string;
}

// ── Histórico ─────────────────────────────────────────────────────────────────

export interface LeituraComScoreDto {
  chuvaMmH: number;
  ventoKmH: number;
  visibilidadeKm: number;
  indiceUv: number;
  temperaturaC: number;
  sensacaoTermica: number;
  umidade: number;
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
