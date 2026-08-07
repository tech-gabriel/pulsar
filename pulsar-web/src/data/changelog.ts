/**
 * Fonte única da verdade do changelog público e da versão atual do app.
 * Conteúdo curado: só as novidades que importam pro usuário, mais recente primeiro.
 * A cada release: adicionar um novo item no topo de CHANGELOG e sincronizar
 * o campo "version" em package.json.
 */

export type TipoMudanca = 'novo' | 'melhoria' | 'correcao';

export interface ItemMudanca {
  tipo: TipoMudanca;
  titulo: string;
  descricao: string;
}

export interface Release {
  /** SemVer, ex.: "1.1.0" */
  versao: string;
  /** ISO, ex.: "2026-06-30" */
  data: string;
  /** Linha opcional de contexto do release. */
  resumo?: string;
  itens: ItemMudanca[];
}

export const CHANGELOG: Release[] = [
  {
    versao: '1.4.0',
    data: '2026-08-07',
    resumo: 'Agora dá para ver onde São Paulo já alagou, rua por rua.',
    itens: [
      {
        tipo: 'novo',
        titulo: 'Camada de alagamentos no mapa',
        descricao:
          'Ative a camada de alagamentos e veja os pontos onde houve alagamento ou inundação nos últimos 12 meses. Os registros vêm da prefeitura e se agrupam conforme você afasta o mapa, para não poluir a visão da cidade.',
      },
      {
        tipo: 'novo',
        titulo: 'Alagamentos perto de você',
        descricao:
          'Use a sua localização e o app mostra quantos alagamentos já foram registrados por perto e a que distância fica o mais próximo. Quando está chovendo sobre uma área com histórico, um aviso de risco elevado aparece na hora.',
      },
      {
        tipo: 'melhoria',
        titulo: 'Mapa mais fácil de usar no celular',
        descricao:
          'Os botões do mapa ficaram maiores e mais fáceis de acertar com o dedo, os controles passaram a acompanhar o tema claro e o zoom saiu de baixo da barra de busca.',
      },
    ],
  },
  {
    versao: '1.3.0',
    data: '2026-07-10',
    resumo: 'Entrar no Pulsar ficou mais rápido.',
    itens: [
      {
        tipo: 'novo',
        titulo: 'Entrar com o Google',
        descricao:
          'Agora dá para entrar ou criar sua conta com um toque, usando a sua conta do Google. Sem precisar lembrar de mais uma senha.',
      },
    ],
  },
  {
    versao: '1.2.0',
    data: '2026-07-01',
    resumo: 'Descubra a sua região no mapa com um toque.',
    itens: [
      {
        tipo: 'novo',
        titulo: 'Ver minha região',
        descricao:
          'Toque no alvo da busca e o app usa a sua localização para abrir a sua região no mapa. As coordenadas são usadas só naquele momento, no seu dispositivo, e não ficam guardadas.',
      },
    ],
  },
  {
    versao: '1.1.0',
    data: '2026-06-30',
    resumo: 'Alertas de risco agora chegam até você, mesmo com o app fechado.',
    itens: [
      {
        tipo: 'novo',
        titulo: 'Notificações push',
        descricao:
          'Ative as notificações e receba um aviso quando uma região favorita entrar em risco alto. Um convite discreto aparece no mapa para facilitar.',
      },
    ],
  },
  {
    versao: '1.0.0',
    data: '2026-06-28',
    resumo: 'O Pulsar chegou. Monitoramento climático de São Paulo, no seu bolso.',
    itens: [
      {
        tipo: 'novo',
        titulo: 'Mapa de risco climático',
        descricao:
          'Veja o nível de risco de cada região de São Paulo em tempo real, com cores que mostram onde a atenção precisa ser maior.',
      },
      {
        tipo: 'novo',
        titulo: 'Histórico e alertas',
        descricao:
          'Acompanhe a evolução do clima por subprefeitura e receba alertas com sugestões de precaução.',
      },
      {
        tipo: 'novo',
        titulo: 'Notícias climáticas',
        descricao:
          'Um feed com as notícias e avisos das fontes oficiais, reunidas em um só lugar.',
      },
    ],
  },
];

/** Versão atual do app. Deriva sempre do release mais recente do changelog. */
export const APP_VERSION = CHANGELOG[0].versao;
