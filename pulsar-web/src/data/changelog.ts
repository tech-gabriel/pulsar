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
    versao: '1.31.0',
    data: '2026-11-09',
    itens: [
      {
        tipo: 'novo',
        titulo: 'Excluir a conta pelo app',
        descricao: 'Em Configurações, no fim da página, agora dá para excluir a sua conta sozinho. Antes a página mostra tudo que vai junto, e você confirma digitando excluir. A exclusão é na hora e chega um e-mail confirmando.',
      },
    ],
  },
  {
    versao: '1.30.1',
    data: '2026-11-09',
    itens: [
      {
        tipo: 'correcao',
        titulo: 'Casa e trabalho não cobrem mais o risco da região',
        descricao: 'De perto, o nome da casa ou do trabalho agora abre para o lado e deixa à vista o número de risco da região. O ponto também passou a marcar o endereço exato que você salvou.',
      },
    ],
  },
  {
    versao: '1.30.0',
    data: '2026-11-09',
    itens: [
      {
        tipo: 'novo',
        titulo: 'Casa e trabalho no mapa',
        descricao: 'Quem salvou casa ou trabalho passa a vê-los no mapa. Toque no ponto e aparece como está a região agora: se está chovendo, o risco e se há alagamento perto, com atalho para ver a região ou montar a rota até lá. Só você vê, e eles não entram na imagem de compartilhar.',
      },
      {
        tipo: 'novo',
        titulo: 'Aviso quando começa a chover em casa ou no trabalho',
        descricao: 'Quando a chuva chega na região da sua casa ou do seu trabalho, o Pulsar avisa no celular. O aviso vem ligado e dá para desligar em Configurações, no grupo Avisos.',
      },
    ],
  },
  {
    versao: '1.29.0',
    data: '2026-11-06',
    itens: [
      {
        tipo: 'novo',
        titulo: 'Casa e trabalho na Rota',
        descricao: 'Salve o endereço da sua casa e do seu trabalho e eles aparecem primeiro quando você toca em De ou Para na Rota. Um toque e o caminho está montado. A região de cada um entra nas suas favoritas, e você pode tirar quando quiser.',
      },
      {
        tipo: 'melhoria',
        titulo: 'Configurações mais organizadas',
        descricao: 'A tela de Configurações ficou em grupos, como os Ajustes do celular: conta, seus lugares, avisos, aparência e sobre. Trocar ou apagar casa e trabalho pede confirmação, e as subprefeituras que você acompanha ganharam uma tela própria.',
      },
    ],
  },
  {
    versao: '1.28.2',
    data: '2026-11-05',
    itens: [
      {
        tipo: 'correcao',
        titulo: 'Página de alagamentos mais clara quando algo falha',
        descricao: 'Se a localização for bloqueada, demorar ou não responder, a página diz o que aconteceu e deixa escolher o bairro. A hora da última leitura ganha a data quando não é de hoje, o botão Tentar de novo mostra que está tentando e, se o mapa não abrir, o resto da página continua funcionando.',
      },
    ],
  },
  {
    versao: '1.28.1',
    data: '2026-11-03',
    itens: [
      {
        tipo: 'melhoria',
        titulo: 'Rota mais limpa no celular',
        descricao: 'O botão Rota virou só o ícone, ao lado do alvo. Com a rota aberta, os controles do mapa saem da frente e o resultado ficou mais compacto. A saída aparece como o seu ponto azul, a chegada ganhou uma bandeira e o caminho virou uma linha pontilhada.',
      },
    ],
  },
  {
    versao: '1.28.0',
    data: '2026-11-03',
    itens: [
      {
        tipo: 'novo',
        titulo: 'Rota com risco no caminho',
        descricao: 'Antes de sair, toque em Rota na busca ou em Como chegar no detalhe de uma subprefeitura, diga de onde sai e para onde vai, e o Pulsar responde numa frase se pode ir, se vale ir com atenção ou se é melhor esperar, e até que horas. O caminho aparece no mapa com a cor do risco de cada subprefeitura, e um toque abre o trajeto no Google Maps, no Waze ou no Apple Maps.',
      },
      {
        tipo: 'novo',
        titulo: 'Me avise quando melhorar',
        descricao: 'Quando a resposta é esperar, peça o aviso e o Pulsar manda uma notificação assim que o caminho ficar tranquilo. Vale por 3 horas e dá para cancelar.',
      },
    ],
  },
  {
    versao: '1.27.0',
    data: '2026-11-03',
    itens: [
      {
        tipo: 'novo',
        titulo: 'Pontos de alagamento em SP hoje',
        descricao: 'Uma página aberta, sem precisar de conta, que mostra o risco agora na sua região, as ruas alagadas neste momento segundo o CGE e onde costuma alagar perto de você. Dá para usar a localização ou escolher o bairro.',
      },
      {
        tipo: 'melhoria',
        titulo: 'Sua região já vem escolhida',
        descricao: 'Quem cria a conta a partir de uma página de região chega no primeiro acesso com essa subprefeitura já marcada.',
      },
    ],
  },
  {
    versao: '1.26.0',
    data: '2026-11-02',
    itens: [
      {
        tipo: 'novo',
        titulo: 'Mapa novo, com cara de Google Maps',
        descricao: 'O mapa agora é desenhado no próprio aparelho: o zoom e o arrasto ficam contínuos, sem o fundo cinza enquanto carregava. As cores lembram o Google Maps, com ruas, avenidas, parques, prédios e mais comércios marcados, e os nomes das ruas aparecem por cima da cor do risco.',
      },
      {
        tipo: 'melhoria',
        titulo: 'Resumo que não persegue o mouse',
        descricao: 'No computador, o resumo da subprefeitura só aparece quando o mouse para sobre ela e some quando você arrasta ou dá zoom. Navegar pelo mapa ficou mais tranquilo.',
      },
    ],
  },
  {
    versao: '1.25.1',
    data: '2026-11-02',
    itens: [
      {
        tipo: 'melhoria',
        titulo: 'Mapa no celular igual ao do computador',
        descricao: 'A barra de abas virou uma cápsula de vidro flutuando sobre o mapa, como o cabeçalho. A lista de subprefeituras ficou num cartão de vidro do tamanho do conteúdo, e o detalhe abre dentro dele com o mapa à vista, centrado na região escolhida. A escolha de camada também ganhou o vidro.',
      },
    ],
  },
  {
    versao: '1.25.0',
    data: '2026-11-01',
    itens: [
      {
        tipo: 'melhoria',
        titulo: 'Mapa mais limpo',
        descricao: 'O efeito de vidro agora fica só nas barras e nos botões, mais leve. Painéis, cartões e listas ficaram sólidos e fáceis de ler. No computador, o painel ao lado deixa o mapa aparecer por trás e não repete mais a mesma subprefeitura em duas listas. O botão de alagamentos virou só a gota, junto do zoom.',
      },
      {
        tipo: 'novo',
        titulo: 'Detalhe da subprefeitura de cara nova',
        descricao: 'O risco aparece grande, com uma frase que diz o motivo ou o que vem pela frente. Logo abaixo, a chuva das próximas horas em barras, e depois um bloco para cada medida, sem número repetido. A dica de proteção usa a cor do risco: vermelho só quando é Alerta.',
      },
      {
        tipo: 'melhoria',
        titulo: 'Convite de alertas mais claro',
        descricao: 'O convite para ligar os alertas agora cita as suas subprefeituras. Quando há chuva forte prevista ou uma delas entra em risco, ele mostra o motivo na hora.',
      },
      {
        tipo: 'melhoria',
        titulo: 'Resumo ao passar o mouse',
        descricao: 'O resumo que aparece sobre o mapa ficou numa linha só, com temperatura, chuva e vento, sem números cortados.',
      },
      {
        tipo: 'correcao',
        titulo: 'Cores da temperatura de São Paulo',
        descricao: '20 °C aparecia em laranja. A escala agora segue o clima da cidade: até 22 °C é azul, de 23 °C a 27 °C é verde, e laranja e vermelho ficam para o calor de verdade.',
      },
      {
        tipo: 'correcao',
        titulo: 'Pequenos acertos',
        descricao: 'O botão de alagamentos mostra quando está ligado, o aviso de favorito ficou legível no tema claro, a estrela de favorito ficou azul, o histórico abre pelo nome da subprefeitura no endereço e a troca de senha mostra a mensagem certa quando algo dá errado.',
      },
    ],
  },
  {
    versao: '1.24.0',
    data: '2026-10-28',
    itens: [
      {
        tipo: 'melhoria',
        titulo: 'Pulsar até 10 vezes mais rápido',
        descricao: 'O Pulsar mudou para um servidor próprio em São Paulo, no mesmo lugar do banco de dados. Antes, cada consulta ia até os Estados Unidos e voltava. A entrada no app, que levava perto de 1 segundo, agora responde em menos de 0,1 segundo, e o mapa e o histórico abrem mais rápido.',
      },
    ],
  },
  {
    versao: '1.23.2',
    data: '2026-10-27',
    itens: [
      {
        tipo: 'correcao',
        titulo: 'Barra do iPhone com o app instalado',
        descricao: 'No iPhone, com o Pulsar na tela de início, a barra de cima (hora e bateria) aparecia borrada, com o mapa passando por baixo. Agora ela fica sólida na cor do app, e nada mais encosta nela nem na barra de baixo.',
      },
      {
        tipo: 'correcao',
        titulo: 'Título da tela de entrada',
        descricao: 'A segunda linha da frase do painel azul começava com um recuo. Agora as duas linhas ficam alinhadas.',
      },
    ],
  },
  {
    versao: '1.23.1',
    data: '2026-10-27',
    itens: [
      {
        tipo: 'melhoria',
        titulo: 'Tela de entrada nova',
        descricao: 'O mapa de São Paulo agora preenche o painel azul em qualquer tamanho de tela, a logo pulsa e a frase e o formulário entram com movimento. Em monitores grandes, o formulário ficou maior.',
      },
      {
        tipo: 'melhoria',
        titulo: 'Barra do celular na cor do app',
        descricao: 'No celular, a barra de cima, onde ficam a hora e a bateria, agora acompanha a cor do Pulsar, no tema claro e no escuro.',
      },
    ],
  },
  {
    versao: '1.23.0',
    data: '2026-10-27',
    itens: [
      {
        tipo: 'melhoria',
        titulo: 'Mapa redesenhado no computador e no tablet',
        descricao: 'O painel virou um cartão flutuante à direita, com a busca dentro: você pesquisa e a resposta aparece logo embaixo. As camadas ficam numa barra no pé do mapa, e o zoom, os alagamentos e a legenda passaram para a esquerda. No tablet em pé o cartão fica no pé da tela e recolhe até só a busca.',
      },
      {
        tipo: 'melhoria',
        titulo: 'Vidro e movimento mais suaves',
        descricao: 'Os controles sobre o mapa ganharam o mesmo vidro do topo, a logo pulsa no canto e a troca de páginas ficou mais suave. Se preferir tudo sólido, desligue o Efeito de vidro em Configurações › Aparência.',
      },
      {
        tipo: 'correcao',
        titulo: 'Tela de entrada em notebooks',
        descricao: 'Em telas mais baixas, o mapa do painel azul da entrada passava por trás do texto. Agora fica sempre embaixo dele.',
      },
    ],
  },
  {
    versao: '1.22.0',
    data: '2026-10-26',
    itens: [
      {
        tipo: 'novo',
        titulo: 'Marca nova',
        descricao: 'O Pulsar ganhou uma logo nova, inspirada no pulsar, a estrela que gira e manda sinais de luz em intervalos certos. Ela já aparece no ícone do celular, na aba do navegador e nos avisos.',
      },
      {
        tipo: 'melhoria',
        titulo: 'O mapa até a borda',
        descricao: 'O topo do app agora flutua sobre o mapa, com efeito de vidro, e o mapa ganhou a tela toda. Prefere o topo sólido? Desligue o Efeito de vidro em Configurações › Aparência. Suas iniciais no canto abrem o menu da conta, com o botão de sair.',
      },
      {
        tipo: 'melhoria',
        titulo: 'Entrada redesenhada',
        descricao: 'As telas de entrar e de criar conta mudaram de cara, e no computador a apresentação do primeiro acesso ficou num cartão no centro da tela, mais fácil de seguir.',
      },
    ],
  },
  {
    versao: '1.21.0',
    data: '2026-10-26',
    itens: [
      {
        tipo: 'melhoria',
        titulo: 'Histórico de alagamentos em dia',
        descricao: 'O histórico de alagamentos vem do GeoSampa, da Prefeitura. Agora, quando ele para de atualizar, a equipe fica sabendo, e o Pulsar tenta buscar de novo a cada duas horas até voltar.',
      },
    ],
  },
  {
    versao: '1.20.0',
    data: '2026-10-26',
    itens: [
      {
        tipo: 'melhoria',
        titulo: 'Chuva conferida todo dia',
        descricao: 'Montamos um painel que compara a chuva registrada em cada subprefeitura com uma segunda fonte e com os alagamentos do CGE. Se uma leitura sair do normal, a equipe vê no dia seguinte, e não semanas depois como aconteceu em setembro.',
      },
    ],
  },
  {
    versao: '1.19.0',
    data: '2026-10-26',
    itens: [
      {
        tipo: 'novo',
        titulo: 'Alagamento confirmado pela cidade',
        descricao: 'Quando o CGE, da Prefeitura, registra uma rua alagada, o Pulsar mostra o ponto no detalhe da sua subprefeitura e no mapa, com o horário e se dá para passar. Se ela estiver nos seus favoritos, você recebe o aviso na hora.',
      },
      {
        tipo: 'melhoria',
        titulo: 'Menos alarme falso',
        descricao: 'O alerta de chuva forte agora só sai quando duas medições seguidas confirmam a chuva, e o aviso de chuva prevista só sai quando duas previsões diferentes concordam. Depois de um aviso, você não recebe outro menor sobre a mesma região nas três horas seguintes.',
      },
    ],
  },
  {
    versao: '1.18.0',
    data: '2026-10-26',
    itens: [
      {
        tipo: 'novo',
        titulo: 'Página inicial nova',
        descricao: 'Agora dá para buscar o seu bairro logo no topo e ver na hora como está a sua região. As 32 subprefeituras também ficaram a um clique.',
      },
      {
        tipo: 'correcao',
        titulo: 'Chuva mais confiável',
        descricao: 'Em alguns dias de setembro e outubro, a Sé, a Lapa, Pinheiros, o Butantã, a Vila Mariana e Pirituba-Jaraguá receberam leituras de chuva que não aconteceu, e isso gerou alertas falsos. Corrigimos o histórico dessas regiões e agora conferimos cada leitura com uma segunda fonte antes de usar.',
      },
    ],
  },
  {
    versao: '1.17.0',
    data: '2026-10-14',
    resumo: 'Depois desta atualização, você vai precisar entrar de novo uma vez. Seus lugares e alertas continuam salvos.',
    itens: [
      {
        tipo: 'novo',
        titulo: 'Confirme seu e-mail',
        descricao: 'Mandamos um link para o e-mail do cadastro. Confirmando, só você consegue usar esse endereço no Pulsar. Se o link se perdeu, dá para pedir outro em Configurações.',
      },
      {
        tipo: 'novo',
        titulo: 'Sair de todos os aparelhos',
        descricao: 'Esqueceu a conta aberta em outro celular ou computador? Em Configurações, logo abaixo de "Sair da conta", você encerra todas as sessões de uma vez.',
      },
      {
        tipo: 'melhoria',
        titulo: 'Senha nova vale na hora',
        descricao: 'Quando você troca ou redefine a senha, os outros aparelhos saem da conta na mesma hora.',
      },
      {
        tipo: 'correcao',
        titulo: 'Mais segurança',
        descricao: 'Limitamos os pedidos de nova senha e reforçamos a proteção do mapa e das notícias.',
      },
    ],
  },
  {
    versao: '1.16.0',
    data: '2026-10-09',
    itens: [
      {
        tipo: 'melhoria',
        titulo: 'Sua localização mais precisa',
        descricao: 'O mapa refina o GPS por alguns segundos, mostra um círculo com a margem de erro e deixa você arrastar o pin para o ponto certo.',
      },
      {
        tipo: 'novo',
        titulo: 'Números da sua região',
        descricao: 'As páginas de cada subprefeitura e zona mostram dias em alerta, chuva acumulada, faixa mais comum e o dia mais chuvoso dos últimos 90 dias, assim que houver histórico suficiente.',
      },
      {
        tipo: 'correcao',
        titulo: 'Mais segurança',
        descricao: 'Reforçamos a proteção das contas, dos alertas e do e-mail de recuperação de senha, e atualizamos as dependências do site.',
      },
    ],
  },
  {
    versao: '1.15.2',
    data: '2026-10-08',
    itens: [
      {
        tipo: 'melhoria',
        titulo: 'Botões mais fáceis de tocar',
        descricao: 'No detalhe da subprefeitura, ativar os alertas ganhou a linha inteira, e histórico e compartilhar ficaram mais largos, no celular e no computador.',
      },
      {
        tipo: 'correcao',
        titulo: 'Compartilhar dentro do Instagram',
        descricao: 'Aberto pelo navegador do Instagram ou do Facebook, o card agora abre numa aba para você tocar e segurar para salvar.',
      },
    ],
  },
  {
    versao: '1.15.1',
    data: '2026-10-08',
    itens: [
      {
        tipo: 'melhoria',
        titulo: 'Mensagem do compartilhar mais limpa',
        descricao: 'O texto que vai junto do card agora chega em linhas separadas, com o link sozinho no fim.',
      },
    ],
  },
  {
    versao: '1.15.0',
    data: '2026-10-08',
    itens: [
      {
        tipo: 'novo',
        titulo: 'Compartilhe o risco da sua subprefeitura',
        descricao: 'Um card pronto para o WhatsApp e o Instagram, com o risco de agora e uma dica do que fazer.',
      },
    ],
  },
  {
    versao: '1.14.0',
    data: '2026-10-07',
    resumo: 'Avisos mais claros, com dicas para chuva, vento e calor.',
    itens: [
      {
        tipo: 'melhoria',
        titulo: 'Tranquilo, Atenção e Alerta',
        descricao: 'O risco agora aparece com nomes fáceis de entender, no app e nas notificações. Tocar no aviso abre a subprefeitura.',
      },
      {
        tipo: 'novo',
        titulo: 'Dicas para cada perigo',
        descricao: 'Quando chuva, vento ou calor pedem cuidado, a subprefeitura mostra o que fazer, com base nas orientações da Defesa Civil e do Ministério da Saúde.',
      },
      {
        tipo: 'novo',
        titulo: 'Aviso de Atenção',
        descricao: 'Quem ligar os avisos de atenção nas configurações também é avisado quando uma subprefeitura entra em Atenção, no máximo uma vez por dia para cada perigo.',
      },
    ],
  },
  {
    versao: '1.13.1',
    data: '2026-10-07',
    itens: [
      {
        tipo: 'correcao',
        titulo: 'Sino em dia com suas favoritas',
        descricao: 'Ao favoritar uma subprefeitura, o sino já passa a considerar ela na hora, sem precisar trocar de página.',
      },
      {
        tipo: 'melhoria',
        titulo: 'Dashboard mais enxuto',
        descricao: 'O resumo da cidade ocupa menos espaço no computador, e as mais críticas aparecem logo abaixo.',
      },
    ],
  },
  {
    versao: '1.13.0',
    data: '2026-10-04',
    resumo: 'O app agora fala só de subprefeituras, com a cidade como visão geral.',
    itens: [
      {
        tipo: 'melhoria',
        titulo: 'Painel com o que importa',
        descricao: 'Abra o mapa e veja como está a cidade agora, as suas subprefeituras e as que pedem atenção. Todas ficam a um toque, com busca.',
      },
      {
        tipo: 'novo',
        titulo: 'Previsão da sua subprefeitura',
        descricao: 'O detalhe de cada subprefeitura mostra a previsão dela própria para as próximas horas.',
      },
      {
        tipo: 'melhoria',
        titulo: 'Sino e dashboard mais pessoais',
        descricao: 'O sino avisa primeiro sobre as suas subprefeituras, e o dashboard mostra o mapa da cidade colorido pelo risco.',
      },
    ],
  },
  {
    versao: '1.12.0',
    data: '2026-10-03',
    resumo: 'Um começo novo: em poucos toques você escolhe seus lugares e liga os alertas.',
    itens: [
      {
        tipo: 'novo',
        titulo: 'Boas-vindas que deixam tudo pronto',
        descricao: 'Ao entrar, escolha as subprefeituras que acompanha, instale o app na tela inicial e ative os alertas, tudo em poucos passos.',
      },
    ],
  },
  {
    versao: '1.11.0',
    data: '2026-10-03',
    resumo: 'Agora você acompanha as subprefeituras que importam para você.',
    itens: [
      {
        tipo: 'novo',
        titulo: 'Alertas por subprefeitura',
        descricao: 'Escolha casa, trabalho ou onde quiser, e receba um aviso só com os lugares que você acompanha, em vez da zona inteira.',
      },
    ],
  },
  {
    versao: '1.10.3',
    data: '2026-10-03',
    itens: [
      {
        tipo: 'melhoria',
        titulo: 'Botões mais fáceis de tocar no celular',
        descricao: 'Entrar, criar conta, tema, voltar, atualizar e ativar alertas ganharam área de toque maior, do tamanho recomendado para o dedo.',
      },
    ],
  },
  {
    versao: '1.10.2',
    data: '2026-10-03',
    itens: [
      {
        tipo: 'correcao',
        titulo: 'Sem dados, o app não diz mais que está tudo tranquilo',
        descricao: 'Enquanto o risco carrega ou se a conexão falhar, o mapa e o sino avisam isso em vez de mostrar que não há alertas.',
      },
    ],
  },
  {
    versao: '1.10.1',
    data: '2026-10-03',
    itens: [
      {
        tipo: 'melhoria',
        titulo: 'Mais fácil de achar no Google',
        descricao: 'A página de cada subprefeitura mostra na busca o risco da região e quantos alagamentos a Defesa Civil registrou lá.',
      },
    ],
  },
  {
    versao: '1.10.0',
    data: '2026-10-01',
    resumo: 'O risco agora entende chuva acumulada e avisa também sobre vento forte e calor extremo.',
    itens: [
      {
        tipo: 'novo',
        titulo: 'Três perigos em cada região',
        descricao:
          'Cada subprefeitura mostra o risco de alagamento, de vento forte e de calor extremo, com o dado que explica cada um. A cor do mapa segue o pior dos três, e quando o motivo não é alagamento um ícone avisa qual é.',
      },
      {
        tipo: 'melhoria',
        titulo: 'Risco de alagamento mais fiel',
        descricao:
          'O cálculo passou a considerar a chuva da última hora, das últimas 3 horas e dos últimos dois dias, que encharca o solo, além do histórico de ocorrências da Defesa Civil em cada subprefeitura. Ele foi testado contra os alagamentos registrados em 2026.',
      },
      {
        tipo: 'melhoria',
        titulo: 'Avisos que dizem qual é o perigo',
        descricao:
          'A notificação de risco alto agora diz se é alagamento, vento forte ou calor extremo, com o número que importa e o que fazer.',
      },
    ],
  },
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
