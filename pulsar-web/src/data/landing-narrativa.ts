import type { CenaId } from '../components/landing/MapaCena';

export interface Cena {
  id: CenaId;
  olho: string;
  titulo: string;
  texto: string;
}

/**
 * As 5 cenas da narrativa da landing, na ordem do scroll. O texto vive aqui
 * (e não no hook de animação) para continuar no HTML prerenderizado.
 */
export const CENAS: Cena[] = [
  {
    id: 'acender',
    olho: 'O MAPA',
    titulo: 'São Paulo inteira, em um lugar só',
    texto:
      'As 32 subprefeituras da cidade, monitoradas de forma contínua a partir de fontes oficiais.',
  },
  {
    id: 'risco',
    olho: 'O RISCO',
    titulo: 'O clima muda de bairro para bairro',
    texto:
      'A média da cidade esconde o que importa. Cada região recebe a sua própria leitura, atualizada a cada 15 minutos.',
  },
  {
    id: 'score',
    olho: 'O SCORE',
    titulo: 'Um número que você consegue conferir',
    texto:
      'O Score de Perigo sai de variáveis objetivas, com pesos definidos e abertos. Nada de caixa-preta.',
  },
  {
    id: 'alagamento',
    olho: 'O HISTÓRICO',
    titulo: 'Onde a cidade já alagou',
    texto:
      'Os pontos de alagamento e inundação dos últimos 12 meses, direto dos registros da prefeitura.',
  },
  {
    id: 'alerta',
    olho: 'O AVISO',
    titulo: 'Você sabe antes de sair de casa',
    texto:
      'Quando a sua região entra em risco alto, o alerta chega no seu celular, mesmo com o app fechado.',
  },
];
