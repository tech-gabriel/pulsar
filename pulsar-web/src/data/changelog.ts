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
    versao: '1.9.0',
    data: '2026-08-20',
    resumo: 'O Pulsar passou a olhar para frente, e não só para o agora.',
    itens: [
      {
        tipo: 'novo',
        titulo: 'Previsão das próximas horas no painel da região',
        descricao:
          'Ao abrir uma região no mapa, o painel mostra o que vem pela frente em faixas de 3 horas: o horário, como fica o céu e quanta chuva é esperada. Fica logo abaixo dos números do momento, então dá para ler o agora e as próximas horas de uma vez só.',
      },
      {
        tipo: 'novo',
        titulo: 'Aviso de chuva forte antes de ela começar',
        descricao:
          'Quem tem as notificações ligadas recebe um aviso quando a previsão aponta chuva forte na região acompanhada, com algumas horas de antecedência. No painel, a faixa dessa chuva aparece destacada, então o aviso no celular e o app contam a mesma história.',
      },
      {
        tipo: 'novo',
        titulo: 'Resumo da sua região pela manhã',
        descricao:
          'Quem deixa o resumo diário ligado nas configurações passa a receber, de manhã, um panorama da região acompanhada: como está o risco e se há chuva prevista para o dia. Chega uma vez por dia, cedo o bastante para você decidir a saída antes de sair.',
      },
    ],
  },
  {
    versao: '1.8.0',
    data: '2026-08-14',
    itens: [
      {
        tipo: 'correcao',
        titulo: 'Botão de camadas do mapa responde por voz',
        descricao:
          'No celular, o botão que troca a camada do mapa mostrava o nome da camada na tela mas era anunciado com outro nome. Quem usa controle por voz falava "Score" e nada acontecia. Agora o nome falado é o mesmo que aparece no botão.',
      },
    ],
  },
  {
    versao: '1.7.0',
    data: '2026-08-11',
    itens: [
      {
        tipo: 'melhoria',
        titulo: 'O Pulsar abre no tema claro',
        descricao:
          'O site passa a abrir no tema claro em todas as telas. Quem prefere o tema escuro pode voltar para ele pelo botão de tema, no topo da página, e a escolha fica salva no navegador.',
      },
    ],
  },
  {
    versao: '1.6.0',
    data: '2026-08-11',
    resumo: 'Uma rodada de correções em coisas que atrapalhavam o uso.',
    itens: [
      {
        tipo: 'correcao',
        titulo: 'A tela de entrar abre direto no formulário',
        descricao:
          'Ao abrir a tela de entrar, a página inicial inteira aparecia antes do formulário, e era preciso rolar bastante para achar onde digitar o e-mail. Agora o formulário aparece de cara.',
      },
      {
        tipo: 'correcao',
        titulo: 'O efeito de vidro voltou',
        descricao:
          'Os painéis, o menu e as caixas de informação do mapa têm um fundo de vidro que desfoca o que passa por trás. Esse desfoque tinha sumido no navegador e voltou em todas as telas.',
      },
      {
        tipo: 'correcao',
        titulo: 'O tema claro não monta mais a página duas vezes',
        descricao:
          'Quem usa o tema claro tinha a página montada duas vezes ao abrir o site, o que deixava a abertura mais lenta e podia dar uma piscada. Agora ela abre de uma vez só.',
      },
      {
        tipo: 'correcao',
        titulo: 'Aviso de carregamento em conexão lenta',
        descricao:
          'Nas telas de entrar e criar conta, uma conexão ruim deixava a tela vazia e sem explicação até tudo terminar de carregar. Agora aparece um aviso de carregamento enquanto isso.',
      },
      {
        tipo: 'correcao',
        titulo: 'O nome certo na aba do navegador',
        descricao:
          'Indo de uma página como Termos de Uso para a de entrar, a aba continuava mostrando o nome anterior. Cada tela voltou a mostrar o seu próprio nome.',
      },
    ],
  },
  {
    versao: '1.5.0',
    data: '2026-08-10',
    resumo: 'A página inicial do Pulsar foi refeita do zero.',
    itens: [
      {
        tipo: 'novo',
        titulo: 'Nova página inicial',
        descricao:
          'Quem chega no Pulsar agora vê o mapa de São Paulo contar a história: as 32 subprefeituras acendendo, o risco mudando de bairro para bairro, os pontos onde a cidade já alagou e o alerta chegando no celular. O mapa acompanha a leitura enquanto você rola a página.',
      },
      {
        tipo: 'melhoria',
        titulo: 'Página inicial mais leve',
        descricao:
          'A animação da página inicial passou a usar recursos nativos do navegador, no lugar de uma biblioteca externa. São 27 KB a menos para baixar, e a rolagem não prende mais a tela.',
      },
      {
        tipo: 'correcao',
        titulo: 'Menu da página inicial fixo no topo',
        descricao:
          'O menu da página inicial deveria acompanhar a rolagem e não estava acompanhando. Agora ele fica sempre à mão, em qualquer ponto da página.',
      },
    ],
  },
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
