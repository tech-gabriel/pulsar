import type { Area } from '../cidade/areas';
import { idDaArea } from '../cidade/cidade';
import { emNomeDe, slugify } from '../../data/regioes-seo';
import type { DicaDto, FaixaRisco } from '../../types';
import { blocosDeDicas } from '../../utils/dicas';
import { labelFaixa } from '../../utils/risco';

export interface CaixaCard { rotulo: string; titulo: string; texto: string }
export interface DadosCard {
  slug: string; idArea: string; nome: string; legenda: string;
  faixa: FaixaRisco; rotuloFaixa: string; perigo: string | null; dado: string;
  caixa: CaixaCard; horario: string; texto: string; link: string;
  /** "RISCO AGORA" ou, com leitura de outro dia, "ÚLTIMA LEITURA": o card não chama de agora um dado velho. */
  topo: string;
}

const ORIGEM = 'https://app-pulsar.com.br';
const NOME_PERIGO = { ALAGAMENTO: 'Alagamento', VENTO: 'Vento', CALOR: 'Calor' } as const;
const num = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

/** "na Mooca" vira "a Mooca", "no Butantã" vira "o Butantã" e "em Itaquera" vira "Itaquera". */
function comArtigo(nome: string): string {
  const em = emNomeDe(nome);
  if (em.startsWith('na ')) return `a ${nome}`;
  if (em.startsWith('no ')) return `o ${nome}`;
  return nome;
}

/** "HOJE · 17H40" no mesmo dia local; "06/10 · 21H05" em outro dia. Fuso do navegador. */
function horario(quando: Date, agora: Date): string {
  const hora = quando.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'H');
  const dia = quando.toDateString() === agora.toDateString()
    ? 'HOJE'
    : quando.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `${dia} · ${hora}`;
}

/**
 * Tudo o que vai no card compartilhável, decidido aqui e só aqui: o desenho não sabe de
 * regra. Tranquilo (ou sem dica para o perigo) leva o "Fique avisado", para o card nunca
 * sair com a caixa vazia e sempre dar o motivo de se cadastrar.
 */
export function dadosDoCard(area: Area, catalogo: DicaDto[], agora: Date = new Date()): DadosCard {
  const slug = slugify(area.nome);
  const link = `${ORIGEM}/cadastro?regiao=${slug}`;
  const score = area.scoreAtual;
  const faixa: FaixaRisco = score?.faixa ?? 'BAIXO';
  const emRisco = faixa !== 'BAIXO';
  const principal = score?.perigoPrincipal ?? 'ALAGAMENTO';
  const l = area.ultimaLeitura;

  let dado = 'Sem risco de chuva forte, vento ou calor agora';
  if (emRisco && principal === 'VENTO') dado = l ? `Ventos de ${Math.round(l.ventoKmH)} km/h` : 'Ventos fortes agora';
  else if (emRisco && principal === 'CALOR') dado = l ? `Sensação de ${Math.round(l.sensacaoTermica)} °C` : 'Calor forte agora';
  else if (emRisco) dado = (score?.chuva3hMm ?? 0) > 0 ? `${num(score!.chuva3hMm!)} mm de chuva em 3 h` : 'Condições de risco de alagamento';

  const bloco = emRisco ? blocosDeDicas(score, catalogo).find((b) => b.perigo === principal) : undefined;
  const primeira = bloco?.dicas[0];
  const caixa: CaixaCard = primeira
    ? { rotulo: 'O QUE FAZER AGORA', titulo: primeira.titulo, texto: primeira.descricao }
    : {
        rotulo: 'FIQUE AVISADO',
        titulo: 'Saiba antes que a água chegue',
        texto: `O Pulsar avisa no seu celular quando ${comArtigo(area.nome)} entrar em Atenção ou Alerta. De graça.`,
      };

  const perigo = emRisco ? NOME_PERIGO[principal] : null;
  const quando = score ? new Date(score.timestamp) : agora;
  const deHoje = quando.toDateString() === agora.toDateString();
  const quandoTexto = deHoje ? 'agora' : `em ${quando.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
  const texto = emRisco
    // Uma ideia por linha: no WhatsApp a mensagem chega limpa e o link fica sozinho na última.
    ? `${area.nome} ${quandoTexto}: ${labelFaixa(faixa)} de ${perigo!.toLowerCase()}\nVeja o risco da sua subprefeitura no Pulsar:\n${link}`
    : `${area.nome} ${quandoTexto}: Tranquilo\nSaiba antes que a água chegue:\n${link}`;

  return {
    slug, idArea: idDaArea(area.nome), nome: area.nome,
    legenda: `${area.zona === 'Centro' ? 'Centro' : `Zona ${area.zona}`} · São Paulo`.toUpperCase(),
    faixa, rotuloFaixa: labelFaixa(faixa).toUpperCase(), perigo, dado, caixa,
    horario: horario(quando, agora),
    texto, link,
    topo: deHoje ? 'RISCO AGORA' : 'ÚLTIMA LEITURA',
  };
}
