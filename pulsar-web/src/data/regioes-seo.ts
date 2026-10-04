// Fonte da verdade das zonas e subprefeituras de SP para as páginas públicas de
// SEO. `nome` da subprefeitura casa com Subprefeitura.Nome do seed do backend
// (usado no deep-link para selecionar a subprefeitura no mapa). Distritos: lista
// oficial da Prefeitura (96 distritos). Sem imports, de propósito: o script
// scripts/gerar-snapshot-ocorrencias.mjs importa este arquivo direto no Node.
export const PREFIXO_REGIAO = '/risco-de-alagamento';

export interface SubprefeituraSeo {
  slug: string;        // usado na URL: /risco-de-alagamento/<slug>
  nome: string;        // igual ao Subprefeitura.Nome do seed
  zonaSlug: string;
  distritos: string[];
  descricao: string;   // texto curado, só fatos verificáveis
  emNome: string;      // com a preposição certa: "na Mooca", "no Butantã", "em Itaquera"
  deNome: string;      // idem: "da Mooca", "do Butantã", "de Itaquera"
}

export interface ZonaSeo {
  slug: string;         // usado na URL: /risco-de-alagamento/<slug>
  nome: string;         // rótulo visível: "Zona Leste"
  nomeRegiao: string;   // casa com Regiao.Nome do app (foco do mapa no deep-link)
  subprefeituras: string[];
}

/** "M'Boi Mirim" -> "mboi-mirim", "Sé" -> "se". */
export function slugify(nome: string): string {
  return nome
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/'/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const SUBPREFEITURAS: Omit<SubprefeituraSeo, 'slug' | 'emNome' | 'deNome'>[] = [
  // Centro
  {
    nome: 'Sé', zonaSlug: 'zona-centro',
    distritos: ['Bela Vista', 'Bom Retiro', 'Cambuci', 'Consolação', 'Liberdade', 'República', 'Santa Cecília', 'Sé'],
    descricao: 'Coração histórico da cidade, a Sé concentra o Vale do Anhangabaú e avenidas construídas sobre córregos canalizados, como a 9 de Julho, sobre o Saracura. Na borda leste corre o Rio Tamanduateí, ao longo do Parque Dom Pedro II.',
  },
  // Leste
  {
    nome: 'Aricanduva-Formosa-Carrão', zonaSlug: 'zona-leste',
    distritos: ['Aricanduva', 'Carrão', 'Vila Formosa'],
    descricao: 'A subprefeitura é cortada pelo Rio Aricanduva, que dá nome à avenida que atravessa a região. O vale do rio é um dos pontos de atenção da Zona Leste em dias de chuva forte.',
  },
  {
    nome: 'Cidade Tiradentes', zonaSlug: 'zona-leste',
    distritos: ['Cidade Tiradentes'],
    descricao: 'No extremo leste da cidade, Cidade Tiradentes reúne um dos maiores conjuntos habitacionais da América Latina. O relevo acidentado soma o risco de enxurrada ao de alagamento nas partes baixas.',
  },
  {
    nome: 'Ermelino Matarazzo', zonaSlug: 'zona-leste',
    distritos: ['Ermelino Matarazzo', 'Ponte Rasa'],
    descricao: 'Ermelino Matarazzo fica próxima à várzea do Rio Tietê, área naturalmente sujeita a cheias. Chuvas intensas e o nível do rio pesam no risco da região.',
  },
  {
    nome: 'Guaianases', zonaSlug: 'zona-leste',
    distritos: ['Guaianases', 'Lajeado'],
    descricao: 'No extremo leste, na divisa com Ferraz de Vasconcelos, Guaianases tem relevo de morros e vales, onde a água da chuva se concentra rapidamente nas partes baixas.',
  },
  {
    nome: 'Itaim Paulista', zonaSlug: 'zona-leste',
    distritos: ['Itaim Paulista', 'Vila Curuçá'],
    descricao: 'Na ponta leste da cidade, o Itaim Paulista fica próximo à várzea do Rio Tietê, área naturalmente sujeita a cheias, e tem muitas ruas de fundo de vale.',
  },
  {
    nome: 'Itaquera', zonaSlug: 'zona-leste',
    distritos: ['Itaquera', 'Cidade Líder', 'José Bonifácio', 'Parque do Carmo'],
    descricao: 'Itaquera abriga o Parque do Carmo e a Neo Química Arena. É uma das subprefeituras mais populosas da Zona Leste, com grandes avenidas que concentram o escoamento da chuva.',
  },
  {
    nome: 'Mooca', zonaSlug: 'zona-leste',
    distritos: ['Mooca', 'Água Rasa', 'Belém', 'Brás', 'Pari', 'Tatuapé'],
    descricao: 'A Mooca margeia o Rio Tamanduateí e a Avenida do Estado, trecho com histórico de alagamentos. Brás e Pari, na baixada do rio, estão entre as áreas mais antigas e adensadas da cidade.',
  },
  {
    nome: 'Penha', zonaSlug: 'zona-leste',
    distritos: ['Penha', 'Artur Alvim', 'Cangaíba', 'Vila Matilde'],
    descricao: 'A Penha se estende até a várzea do Rio Tietê, pelo distrito de Cangaíba. As partes baixas próximas ao rio e à Marginal são as mais sensíveis a chuvas fortes.',
  },
  {
    nome: 'Sapopemba', zonaSlug: 'zona-leste',
    distritos: ['Sapopemba'],
    descricao: 'Sapopemba é um dos distritos mais populosos de São Paulo, com ocupação densa e muitas ruas em encosta, o que acelera o escoamento da chuva para as partes baixas.',
  },
  {
    nome: 'São Mateus', zonaSlug: 'zona-leste',
    distritos: ['São Mateus', 'Iguatemi', 'São Rafael'],
    descricao: 'São Mateus fica na divisa com Santo André e Mauá. O relevo de morros e a ocupação em áreas de várzea tornam alguns pontos da região sensíveis a temporais.',
  },
  {
    nome: 'São Miguel', zonaSlug: 'zona-leste',
    distritos: ['São Miguel', 'Jardim Helena', 'Vila Jacuí'],
    descricao: 'São Miguel inclui o Jardim Helena, na várzea do Rio Tietê, onde fica o Jardim Pantanal, que ficou meses alagado entre 2009 e 2010.',
  },
  {
    nome: 'Vila Prudente', zonaSlug: 'zona-leste',
    distritos: ['Vila Prudente', 'São Lucas'],
    descricao: 'Vila Prudente faz divisa com São Caetano do Sul e é atendida pela Linha 15-Prata do monotrilho. Áreas baixas próximas aos córregos da região concentram o risco em chuvas fortes.',
  },
  // Norte
  {
    nome: 'Casa Verde-Limão-Cachoeirinha', zonaSlug: 'zona-norte',
    distritos: ['Casa Verde', 'Cachoeirinha', 'Limão'],
    descricao: 'A subprefeitura vai da Marginal Tietê até as encostas próximas à Serra da Cantareira. As partes baixas junto ao rio e as ruas de morro têm riscos diferentes em dias de temporal.',
  },
  {
    nome: 'Freguesia-Brasilândia', zonaSlug: 'zona-norte',
    distritos: ['Freguesia do Ó', 'Brasilândia'],
    descricao: 'Na Zona Norte, junto à Serra da Cantareira, Freguesia do Ó e Brasilândia têm relevo íngreme. Além de alagamento nas partes baixas, a região tem áreas de risco de deslizamento.',
  },
  {
    nome: 'Jaçanã-Tremembé', zonaSlug: 'zona-norte',
    distritos: ['Jaçanã', 'Tremembé'],
    descricao: 'Jaçanã e Tremembé ficam ao pé da Serra da Cantareira, no extremo norte da cidade. A água que desce da serra em chuvas intensas aumenta o volume nos córregos da região.',
  },
  {
    nome: 'Perus-Anhanguera', zonaSlug: 'zona-norte',
    distritos: ['Perus', 'Anhanguera'],
    descricao: 'No extremo noroeste da cidade, Perus-Anhanguera é cortada pelas rodovias Anhanguera e Bandeirantes e tem relevo de morros, com áreas ainda pouco urbanizadas.',
  },
  {
    nome: 'Pirituba-Jaraguá', zonaSlug: 'zona-norte',
    distritos: ['Pirituba', 'Jaraguá', 'São Domingos'],
    descricao: 'Pirituba-Jaraguá abriga o Pico do Jaraguá, ponto mais alto da cidade. O relevo acidentado faz a chuva escoar rápido para os fundos de vale.',
  },
  {
    nome: 'Santana-Tucuruvi', zonaSlug: 'zona-norte',
    distritos: ['Santana', 'Tucuruvi', 'Mandaqui'],
    descricao: 'Santana-Tucuruvi vai da Marginal Tietê até o Horto Florestal, ao pé da Cantareira. Os trechos próximos ao rio são os mais expostos a alagamento.',
  },
  {
    nome: 'Vila Maria-Vila Guilherme', zonaSlug: 'zona-norte',
    distritos: ['Vila Maria', 'Vila Guilherme', 'Vila Medeiros'],
    descricao: 'Vila Maria e Vila Guilherme margeiam o Rio Tietê, em área de várzea. Chuvas fortes que elevam o nível do rio afetam as ruas mais baixas da região.',
  },
  // Oeste
  {
    nome: 'Butantã', zonaSlug: 'zona-oeste',
    distritos: ['Butantã', 'Morumbi', 'Raposo Tavares', 'Rio Pequeno', 'Vila Sônia'],
    descricao: 'O Butantã, onde fica a Cidade Universitária da USP, se estende pela margem oeste do Rio Pinheiros. Córregos que descem para o rio concentram o risco em dias de temporal.',
  },
  {
    nome: 'Lapa', zonaSlug: 'zona-oeste',
    distritos: ['Lapa', 'Barra Funda', 'Jaguara', 'Jaguaré', 'Perdizes', 'Vila Leopoldina'],
    descricao: 'A Lapa fica perto do encontro dos rios Tietê e Pinheiros. Barra Funda e Vila Leopoldina estão em área de várzea, e a região da Pompeia tem histórico de alagamento ligado ao córrego Água Preta.',
  },
  {
    nome: 'Pinheiros', zonaSlug: 'zona-oeste',
    distritos: ['Pinheiros', 'Alto de Pinheiros', 'Itaim Bibi', 'Jardim Paulista'],
    descricao: 'Pinheiros margeia o rio de mesmo nome e reúne polos de negócios como a Faria Lima e o Itaim Bibi. Avenidas de fundo de vale concentram a água em chuvas intensas.',
  },
  // Sul
  {
    nome: 'Campo Limpo', zonaSlug: 'zona-sul',
    distritos: ['Campo Limpo', 'Capão Redondo', 'Vila Andrade'],
    descricao: 'Campo Limpo inclui o Capão Redondo e a Vila Andrade, onde fica Paraisópolis. A ocupação densa ao longo dos córregos da região aumenta a exposição a cheias.',
  },
  {
    nome: 'Capela do Socorro', zonaSlug: 'zona-sul',
    distritos: ['Socorro', 'Cidade Dutra', 'Grajaú'],
    descricao: 'Entre as represas Guarapiranga e Billings, a Capela do Socorro inclui o Grajaú e o Autódromo de Interlagos, em Cidade Dutra. A ocupação próxima às represas e aos córregos aumenta a exposição a cheias.',
  },
  {
    nome: 'Cidade Ademar', zonaSlug: 'zona-sul',
    distritos: ['Cidade Ademar', 'Pedreira'],
    descricao: 'Cidade Ademar fica na divisa com Diadema e chega à Represa Billings pelo distrito de Pedreira. Córregos que descem para a represa cortam bairros densamente ocupados.',
  },
  {
    nome: 'Ipiranga', zonaSlug: 'zona-sul',
    distritos: ['Ipiranga', 'Cursino', 'Sacomã'],
    descricao: 'O Ipiranga, onde fica o Museu do Ipiranga, é cortado pelo riacho de mesmo nome e margeia o Rio Tamanduateí, trecho com histórico de alagamentos na Avenida do Estado.',
  },
  {
    nome: 'Jabaquara', zonaSlug: 'zona-sul',
    distritos: ['Jabaquara'],
    descricao: 'O Jabaquara, ponto final da Linha 1-Azul do Metrô, faz divisa com Diadema. Ruas de fundo de vale na região acumulam água em chuvas fortes.',
  },
  {
    nome: "M'Boi Mirim", zonaSlug: 'zona-sul',
    distritos: ['Jardim Ângela', 'Jardim São Luís'],
    descricao: "M'Boi Mirim fica às margens da Represa Guarapiranga e reúne o Jardim Ângela e o Jardim São Luís. Tem ocupação densa em áreas de encosta e de várzea.",
  },
  {
    nome: 'Parelheiros', zonaSlug: 'zona-sul',
    distritos: ['Parelheiros', 'Marsilac'],
    descricao: 'Parelheiros é a maior subprefeitura em área, com Mata Atlântica e mananciais. Marsilac é o maior distrito da cidade. A ocupação perto de rios e represas é sensível a chuvas intensas.',
  },
  {
    nome: 'Santo Amaro', zonaSlug: 'zona-sul',
    distritos: ['Santo Amaro', 'Campo Belo', 'Campo Grande'],
    descricao: 'Santo Amaro margeia o Rio Pinheiros e reúne polos comerciais e empresariais da Zona Sul. Avenidas próximas ao rio concentram a água em temporais.',
  },
  {
    nome: 'Vila Mariana', zonaSlug: 'zona-sul',
    distritos: ['Vila Mariana', 'Moema', 'Saúde'],
    descricao: 'A Vila Mariana abriga o Parque Ibirapuera, por onde passa o córrego do Sapateiro, canalizado. O entorno do parque tem histórico de alagamento e recebe obras de novas galerias de drenagem da Prefeitura.',
  },
];

// Preposição de cada nome ("na Sé", "no Ipiranga"); ausente = "em".
const PREPOSICAO: Record<string, 'na' | 'no'> = {
  'Sé': 'na', 'Itaim Paulista': 'no', 'Mooca': 'na', 'Penha': 'na', 'Vila Prudente': 'na',
  'Casa Verde-Limão-Cachoeirinha': 'na', 'Freguesia-Brasilândia': 'na', 'Jaçanã-Tremembé': 'no',
  'Vila Maria-Vila Guilherme': 'na', 'Butantã': 'no', 'Lapa': 'na', 'Campo Limpo': 'no',
  'Capela do Socorro': 'na', 'Cidade Ademar': 'na', 'Ipiranga': 'no', 'Jabaquara': 'no',
  "M'Boi Mirim": 'no', 'Vila Mariana': 'na',
};

const CONTRACAO_DE = { na: 'da', no: 'do' } as const;

export const subprefeituras: SubprefeituraSeo[] = SUBPREFEITURAS.map((s) => {
  const prep = PREPOSICAO[s.nome];
  return {
    ...s,
    slug: slugify(s.nome),
    emNome: `${prep ?? 'em'} ${s.nome}`,
    deNome: `${prep ? CONTRACAO_DE[prep] : 'de'} ${s.nome}`,
  };
});

const ZONAS_BASE = [
  { slug: 'zona-centro', nome: 'Zona Centro', nomeRegiao: 'Centro' },
  { slug: 'zona-leste', nome: 'Zona Leste', nomeRegiao: 'Leste' },
  { slug: 'zona-norte', nome: 'Zona Norte', nomeRegiao: 'Norte' },
  { slug: 'zona-oeste', nome: 'Zona Oeste', nomeRegiao: 'Oeste' },
  { slug: 'zona-sul', nome: 'Zona Sul', nomeRegiao: 'Sul' },
];

export const zonas: ZonaSeo[] = ZONAS_BASE.map((z) => ({
  ...z,
  subprefeituras: subprefeituras.filter((s) => s.zonaSlug === z.slug).map((s) => s.nome),
}));

export function getZonaPorSlug(slug: string): ZonaSeo | undefined {
  return zonas.find((z) => z.slug === slug);
}

export function getSubprefeituraPorSlug(slug: string): SubprefeituraSeo | undefined {
  return subprefeituras.find((s) => s.slug === slug);
}

/** "na Mooca", "no Butantã", "em Itaquera" pelo nome de exibição. */
export function emNomeDe(nome: string): string {
  return getSubprefeituraPorSlug(slugify(nome))?.emNome ?? `em ${nome}`;
}

/**
 * Resolve o ?regiao=<slug> do deep-link: zona -> foca a região; subprefeitura ->
 * foca a região dela e seleciona a subprefeitura. Slug desconhecido -> undefined.
 */
export function resolverDeepLink(slug: string): { nomeRegiao: string; nomeSub: string | null } | undefined {
  const zona = getZonaPorSlug(slug);
  if (zona) return { nomeRegiao: zona.nomeRegiao, nomeSub: null };
  const sub = getSubprefeituraPorSlug(slug);
  if (!sub) return undefined;
  return { nomeRegiao: getZonaPorSlug(sub.zonaSlug)!.nomeRegiao, nomeSub: sub.nome };
}

/** Paths de todas as páginas de SEO (5 zonas + 32 subprefeituras). */
export function regiaoPaths(): string[] {
  return [...zonas, ...subprefeituras].map((r) => `${PREFIXO_REGIAO}/${r.slug}`);
}
