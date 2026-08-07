export type FaixaRisco = 'BAIXO' | 'MODERADO' | 'ALTO';

export type TipoPerfil = 'CIDADAO' | 'MOTORISTA' | 'CICLISTA' | 'DEFESA_CIVIL';

/** Papel de acesso (autorização), distinto de TipoPerfil (persona de UX). */
export type RoleAcesso = 'USUARIO' | 'SUPORTE' | 'ADMIN';

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface UsuarioDto {
  id: string;
  nome: string;
  email: string;
  perfil: TipoPerfil;
  role: RoleAcesso;
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

// ── Admin ─────────────────────────────────────────────────────────────────────

export interface UsuarioAdminDto {
  id: string;
  nome: string;
  email: string;
  perfil: TipoPerfil;
  role: RoleAcesso;
  ativo: boolean;
  criadoEm: string;
}

export interface SugestaoAdminDto {
  id: string;
  categoria: string;
  faixaRisco: FaixaRisco;
  titulo: string;
  descricao: string;
  ativa: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface SalvarSugestaoRequest {
  categoria: string;
  faixaRisco: FaixaRisco;
  titulo: string;
  descricao: string;
  ativa: boolean;
}

export interface SubprefeituraStatusDto {
  nome: string;
  ultimaLeitura: string | null;
}

export interface SistemaStatusDto {
  subprefeiturasAtivas: number;
  subprefeiturasComLeitura: number;
  ultimaColeta: string | null;
  leiturasUltimas24h: number;
  intervaloColetaMinutos: number;
  subprefeituras: SubprefeituraStatusDto[];
}

export interface MetricasDto {
  totalUsuarios: number;
  usuariosAtivos: number;
  admins: number;
  suportes: number;
  totalSugestoes: number;
  sugestoesAtivas: number;
  alertasUltimas24h: number;
  leiturasUltimas24h: number;
}

export interface ColetaResultadoDto {
  subprefeiturasProcessadas: number;
  scoresCalculados: number;
  alertasGerados: number;
  concluidoEm: string;
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

/** Endereço retornado pela busca de geocoding (GET /api/busca/enderecos). */
export interface EnderecoBusca {
  /** Rótulo principal (ex.: "Shopping Eldorado", "Avenida Paulista"). */
  nome: string;
  /** Descrição completa/contexto. */
  descricao: string;
  /** Categoria do provedor: "poi", "address", "place", "neighbourhood"… */
  tipo: string;
  latitude: number;
  longitude: number;
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

// ── Notícias ──────────────────────────────────────────────────────────────────

/** Retornado por GET /api/noticias (feed do CGE-SP) */
export interface NoticiaDto {
  titulo: string;
  resumo: string;
  link: string;
  publicadoEm: string;
  fonte: string;
  fonteUrl: string;
}

// ── Ocorrências de alagamento (GeoSampa) ──────────────────────────────────────

/** Retornado por GET /api/ocorrencias/alagamento */
export interface OcorrenciaAlagamentoDto {
  id: string;
  tipo: 'ALAGAMENTO' | 'INUNDACAO';
  dataOcorrencia: string;
  latitude: number;
  longitude: number;
  nmSubprefeitura: string | null;
}

/** Retornado por GET /api/ocorrencias/alagamento/proximas */
export interface OcorrenciasProximasDto {
  total: number;
  alagamentos: number;
  inundacoes: number;
  maisProximaMetros: number | null;
  riscoElevado: boolean;
  chuvaMmH: number | null;
}
