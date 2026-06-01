// Abreviações dos nomes de subprefeitura para exibição compacta no mapa (ETAPA 2.2).
// O nome completo continua no tooltip; aqui usamos a versão curta abaixo do score.
// Chaves normalizadas (sem acento, minúsculas) para casar com variações do GeoJSON.

const ABREVIACOES: Record<string, string> = {
  'Aricanduva-Formosa-Carrão': 'Aricanduva',
  'Casa Verde-Limão-Cachoeirinha': 'Casa Verde',
  'Freguesia-Brasilândia': 'Freguesia',
  'Jaçanã-Tremembé': 'Jaçanã',
  'Perus-Anhanguera': 'Perus',
  'Pirituba-Jaraguá': 'Pirituba',
  'Santana-Tucuruvi': 'Santana',
  'Vila Maria-Vila Guilherme': 'Vila Maria',
  'Capela do Socorro': 'C. Socorro',
  'Cidade Tiradentes': 'C. Tiradentes',
  'Cidade Ademar': 'C. Ademar',
  'Ermelino Matarazzo': 'Ermelino M.',
  'Itaim Paulista': 'Itaim Pta.',
  'Vila Prudente': 'V. Prudente',
  'Vila Mariana': 'V. Mariana',
  'Campo Limpo': 'C. Limpo',
  'Santo Amaro': 'Sto. Amaro',
  'São Mateus': 'S. Mateus',
  'São Miguel': 'S. Miguel',
  'São Miguel Paulista': 'S. Miguel',
  "M'Boi Mirim": "M'Boi Mirim",
};

function normalizar(nome: string): string {
  return nome.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

// Índice normalizado para busca tolerante a acentos/caixa.
const POR_NORMAL: Record<string, string> = Object.fromEntries(
  Object.entries(ABREVIACOES).map(([k, v]) => [normalizar(k), v]),
);

/** Retorna o nome abreviado para o mapa, ou o próprio nome se não houver abreviação. */
export function nomeAbreviado(nome: string): string {
  return POR_NORMAL[normalizar(nome)] ?? nome;
}
