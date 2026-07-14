// Fonte da verdade das zonas de SP para as páginas públicas de SEO.
// Derivado do seed do backend (Regiao + Subprefeitura.RegiaoId). As 32
// subprefeituras entram na fase 2 (páginas próprias); aqui são conteúdo das zonas.
export const PREFIXO_REGIAO = '/risco-de-alagamento';

export interface ZonaSeo {
  slug: string;         // usado na URL: /risco-de-alagamento/<slug>
  nome: string;         // rótulo visível: "Zona Leste"
  nomeRegiao: string;   // casa com Regiao.Nome do app (foco do mapa no deep-link)
  subprefeituras: string[];
}

export const zonas: ZonaSeo[] = [
  { slug: 'zona-centro', nome: 'Zona Centro', nomeRegiao: 'Centro', subprefeituras: ['Sé'] },
  {
    slug: 'zona-leste', nome: 'Zona Leste', nomeRegiao: 'Leste',
    subprefeituras: [
      'Aricanduva-Formosa-Carrão', 'Cidade Tiradentes', 'Ermelino Matarazzo', 'Guaianases',
      'Itaim Paulista', 'Itaquera', 'Mooca', 'Penha', 'Sapopemba', 'São Mateus',
      'São Miguel', 'Vila Prudente',
    ],
  },
  {
    slug: 'zona-norte', nome: 'Zona Norte', nomeRegiao: 'Norte',
    subprefeituras: [
      'Casa Verde-Limão-Cachoeirinha', 'Freguesia-Brasilândia', 'Jaçanã-Tremembé',
      'Perus-Anhanguera', 'Pirituba-Jaraguá', 'Santana-Tucuruvi', 'Vila Maria-Vila Guilherme',
    ],
  },
  {
    slug: 'zona-oeste', nome: 'Zona Oeste', nomeRegiao: 'Oeste',
    subprefeituras: ['Butantã', 'Lapa', 'Pinheiros'],
  },
  {
    slug: 'zona-sul', nome: 'Zona Sul', nomeRegiao: 'Sul',
    subprefeituras: [
      'Campo Limpo', 'Capela do Socorro', 'Cidade Ademar', 'Ipiranga', 'Jabaquara',
      "M'Boi Mirim", 'Parelheiros', 'Santo Amaro', 'Vila Mariana',
    ],
  },
];

export function getZonaPorSlug(slug: string): ZonaSeo | undefined {
  return zonas.find((z) => z.slug === slug);
}

export function zonaPaths(): string[] {
  return zonas.map((z) => `${PREFIXO_REGIAO}/${z.slug}`);
}
