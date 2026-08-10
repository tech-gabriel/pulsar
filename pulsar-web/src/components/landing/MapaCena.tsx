import { useEffect, useId, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { SUBPREFEITURAS, VIEWBOX } from './mapaPaths';
import { PALETA, comAlfa } from '../../utils/paleta';

export type CenaId = 'acender' | 'risco' | 'score' | 'alagamento' | 'alerta';

/**
 * Altura do recorte usado só no hero (`compacta`). O viewBox cheio (`VIEWBOX`)
 * é bem vertical porque São Paulo desce até y=1542.3 na ponta de Parelheiros;
 * numa coluna estreita isso produz um SVG alto demais e empurra o CTA do hero
 * para fora da primeira dobra.
 *
 * Não existe linha de corte "limpa": qualquer y entre 903 e 1542 atravessa
 * Parelheiros, e abaixo de 1173 também atravessa Capela do Socorro. Em 920 o
 * corte deixa Capela do Socorro em 45% e M'Boi Mirim em 90%, então a base do
 * mapa é dissolvida por uma máscara (ver `INICIO_FADE`) para a borda reta
 * não ficar legível.
 */
const ALTURA_COMPACTA = 920;

/** Largura do viewBox gerado (`0 0 <largura> <altura>`), para tudo aqui acompanhar `npm run mapa:svg`. */
const [, , LARGURA_VIEWBOX] = VIEWBOX.split(' ');

export const VIEWBOX_COMPACTO = `0 0 ${LARGURA_VIEWBOX} ${ALTURA_COMPACTA}`;

/**
 * Onde o fade da base começa, em fração da altura do recorte. De 0.80 a 1.0
 * dá ~18% de dissolvência, o bastante para a linha de corte sumir sem comer
 * a mancha urbana que interessa (Sé fica em y~500).
 */
const INICIO_FADE = 0.8;

/** Subprefeitura que a narrativa foca a partir da cena 3. */
const FOCO_ID = 'se';
const SCORE_FOCO = 72;

/**
 * Nome de exibição da região em foco. Escrito à mão de propósito: os `nome` do
 * `mapaPaths.ts` vêm gerados do GeoSampa em caixa alta e sem acento ("SE",
 * "M BOI MIRIM"), o que serve para o `<title>` mas não para um rótulo que o
 * usuário lê no mapa. Precisa ser atualizado junto com `FOCO_ID`.
 */
const NOME_FOCO = 'Sé';

/**
 * Centro do bounding box de um `d`, em coordenadas do viewBox. Os paths
 * gerados só usam `M`/`L`/`Z`, então os números saem sempre em pares x,y.
 */
function centroDoPath(d: string) {
  const n = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const xs = n.filter((_, i) => i % 2 === 0);
  const ys = n.filter((_, i) => i % 2 === 1);
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
}

/**
 * Centro, em coordenadas do viewBox, da subprefeitura em foco. Compartilhado
 * pelo número do score e pelo rótulo da região (ver `ANCORA_FOCO`): antes
 * cada um fazia a própria busca em `SUBPREFEITURAS` + `centroDoPath` para
 * chegar num sistema de unidades diferente (o score em %, o rótulo em
 * unidades do viewBox), e foi exatamente essa divergência de unidades que
 * deixou o rótulo colidir com o número em telas estreitas — a % do score não
 * encolhia junto com o `fontSize` fixo do rótulo. Com os dois em unidades do
 * viewBox, escalam juntos por construção.
 */
const CENTRO_FOCO = (() => {
  const foco = SUBPREFEITURAS.find((s) => s.id === FOCO_ID);
  return foco ? centroDoPath(foco.d) : { x: 0, y: 0 };
})();

/**
 * Tamanho do número do score, em unidades do viewBox (mesmo sistema do
 * `fontSize` dos outros rótulos: 52 na temperatura, 40 no rótulo da região).
 * Escolhido para manter a proporção que o antigo `text-6xl` do HTML tinha na
 * largura de coluna do desktop: a `.landing-narrativa` tem `max-width:
 * 1120px` com `gap: 4rem` (64px) entre as duas colunas de 1fr, então cada
 * coluna sai em ~528px — escala de 528 / 1000 (LARGURA_VIEWBOX) ≈ 0.528px
 * por unidade. 112 unidades × 0.528 ≈ 59px, equivalente ao `text-6xl` (60px)
 * que o HTML usava.
 */
const TAMANHO_SCORE = 112;

/**
 * Faixa de risco ilustrativa por subprefeitura. Determinística (não aleatória)
 * para o mapa não piscar cores diferentes a cada render e para o teste poder
 * afirmar sobre ela. Distribui as faixas de forma plausível, sem dizer que é
 * leitura real: a landing é ilustrativa, o dado ao vivo está no app.
 */
function faixaDe(indice: number): 'baixo' | 'moderado' | 'alto' {
  const r = indice % 7;
  if (r === 0 || r === 3) return 'moderado';
  if (r === 5) return 'alto';
  return 'baixo';
}

const COR_FAIXA: Record<'baixo' | 'moderado' | 'alto', string> = {
  baixo: PALETA.verde,
  moderado: PALETA.amarelo,
  alto: PALETA.vermelho,
};

/**
 * Subprefeituras que recebem rótulo de temperatura na cena `risco`. Um
 * subconjunto espalhado pelas zonas: as 32 de uma vez viram ruído e o mapa
 * deixa de ser legível. São essas que sustentam a frase da cena ("o clima muda
 * de bairro para bairro"), mostrando a diferença entre pontos distantes.
 */
const ROTULOS_TEMPERATURA: { id: string; valor: number }[] = [
  { id: 'se', valor: 31 },
  { id: 'santana-tucuruvi', valor: 28 },
  { id: 'cidade-tiradentes', valor: 33 },
  { id: 'butanta', valor: 27 },
  { id: 'parelheiros', valor: 24 },
];

/**
 * Rótulos já resolvidos em coordenadas do viewBox. Feito uma vez no módulo:
 * são constantes, não faz sentido recalcular a cada render. Ids que não
 * existirem no mapa gerado são descartados em silêncio, para o componente não
 * quebrar se o GeoSampa renomear uma subprefeitura.
 */
const TEMPERATURAS = ROTULOS_TEMPERATURA.flatMap(({ id, valor }) => {
  const sub = SUBPREFEITURAS.find((s) => s.id === id);
  if (!sub) return [];
  return [{ id, valor, ...centroDoPath(sub.d) }];
});

/**
 * Onde ancorar o rótulo da região em foco, em coordenadas do viewBox. Sai
 * abaixo do centro para não colidir com o número do score, que ocupa o
 * centro exato do mesmo polígono (`CENTRO_FOCO`). O deslocamento soma metade
 * do `fontSize` de cada texto (teto conservador para a altura da caixa de um
 * dígito/palavra, já que a altura real da fonte renderizada é menor) mais um
 * respiro de 12 unidades: 112/2 (score) + 12 (respiro) + 40/2 (rótulo) = 88.
 * Como os três números estão em unidades do viewBox, a folga se mantém em
 * qualquer largura de tela — diferente da versão anterior, que media o score
 * em % do container e o rótulo em unidades do viewBox.
 */
const ANCORA_FOCO = { x: CENTRO_FOCO.x, y: CENTRO_FOCO.y + 88 };

/** Pontos de alagamento ilustrativos, em coordenadas do viewBox. */
const PONTOS_ALAGAMENTO = [
  { cx: 512, cy: 543 },
  { cx: 548, cy: 505 },
  { cx: 470, cy: 578 },
  { cx: 559, cy: 590 },
  { cx: 497, cy: 470 },
];

/** Duração da contagem do score, em ms. */
const DURACAO_CONTAGEM = 800;

/**
 * Conta de 0 até `alvo` enquanto `ativo`. É o único JS de animação que sobra na
 * narrativa: o resto é transição de CSS. Vale o custo porque um número que
 * sobe lê como medição acontecendo, e um número parado lê como imagem.
 *
 * Com `prefers-reduced-motion` mostra o valor final direto, sem quadro
 * intermediário.
 *
 * `ativo` e a preferência de movimento já são conhecidos de forma síncrona no
 * render (não vêm de um sistema externo), então os casos "parado" (0) e
 * "direto" (`alvo`) são só uma leitura derivada no fim da função — sem
 * `setState` nenhum, então não corre atrás do quadro em que o efeito ainda
 * não rodou (é o que faz "mostra 72 direto" não precisar esperar nenhum
 * quadro). Só o loop de `requestAnimationFrame` de fato anima, e o cleanup
 * zera `valor` ao desativar: sem isso, reentrar na cena mostraria por um
 * quadro o número final da vez anterior antes de recomeçar do zero.
 */
function useContagem(alvo: number, ativo: boolean) {
  const [valor, setValor] = useState(0);
  const reduzido =
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!ativo || reduzido) return;

    let quadro = 0;
    const inicio = performance.now();

    const passo = (agora: number) => {
      const progresso = Math.min(1, (agora - inicio) / DURACAO_CONTAGEM);
      // easeOutCubic: sobe rápido e assenta, que é como um medidor se comporta.
      setValor(Math.round(alvo * (1 - Math.pow(1 - progresso, 3))));
      if (progresso < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);

    return () => {
      cancelAnimationFrame(quadro);
      setValor(0);
    };
  }, [alvo, ativo, reduzido]);

  if (!ativo) return 0;
  if (reduzido) return alvo;
  return valor;
}

interface Props {
  cena: CenaId;
  className?: string;
  /**
   * Recorta a base do mapa e a dissolve num fade (ver `ALTURA_COMPACTA`).
   * Default `false` preserva o comportamento existente (viewBox cheio) para
   * a narrativa. Usado só pelo hero, onde a coluna é estreita e o mapa
   * vertical cheio empurrava o CTA para fora da primeira dobra.
   */
  compacta?: boolean;
}

/**
 * Mapa vetorial de São Paulo nos 5 estados da narrativa da landing. Puramente
 * declarativo: quem controla a cena é o `LandingNarrativa`. O SVG é decorativo
 * (`aria-hidden`), porque a informação vive no texto de cada cena; o único
 * conteúdo anunciado é o alerta da cena 5.
 */
export default function MapaCena({ cena, className, compacta = false }: Props) {
  const mostraRisco = cena !== 'acender';
  const mostraFoco = cena === 'score' || cena === 'alagamento' || cena === 'alerta';
  const score = useContagem(SCORE_FOCO, cena === 'score');

  // `useId` traz caracteres que não valem como id de fragmento; sobram letras e
  // dígitos para o `url(#...)` continuar resolvendo com dois mapas na mesma página.
  const idBase = useId().replace(/[^a-zA-Z0-9]/g, '');
  const idFade = `mapa-fade-${idBase}`;
  const idMascara = `mapa-mascara-${idBase}`;

  return (
    <div className={`relative ${className ?? ''}`} data-mapa-cena={cena}>
      <svg viewBox={compacta ? VIEWBOX_COMPACTO : VIEWBOX} aria-hidden="true" className="w-full h-auto">
        {compacta && (
          <defs>
            <linearGradient id={idFade} x1="0" y1="0" x2="0" y2="1">
              <stop offset={INICIO_FADE} stopColor="#fff" stopOpacity="1" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <mask id={idMascara}>
              <rect
                x="0"
                y="0"
                width={LARGURA_VIEWBOX}
                height={ALTURA_COMPACTA}
                fill={`url(#${idFade})`}
              />
            </mask>
          </defs>
        )}

        <g
          data-mascarado={compacta ? 'true' : undefined}
          mask={compacta ? `url(#${idMascara})` : undefined}
        >
          {SUBPREFEITURAS.map((s, i) => {
            const emFoco = mostraFoco && s.id === FOCO_ID;
            // Na cena 5 o texto e o badge dizem "risco alto"; a faixa
            // determinística da Sé é 'moderado', então sem esta exceção o
            // alerta vermelho apontava para um polígono amarelo.
            const emAlerta = emFoco && cena === 'alerta';
            const faixa = emAlerta ? 'alto' : faixaDe(i);
            const cor = mostraRisco ? COR_FAIXA[faixa] : PALETA.neutro;
            // Fora de foco o mapa recua para o número em foco poder brilhar.
            const alfa = mostraFoco && !emFoco ? 0.16 : mostraRisco ? 0.55 : 0.1;

            return (
              <path
                key={s.id}
                d={s.d}
                data-subprefeitura={s.id}
                data-risco={mostraRisco ? faixa : undefined}
                data-foco={emFoco ? 'true' : undefined}
                style={{ '--i': i } as React.CSSProperties}
                fill={comAlfa(cor, alfa)}
                stroke={comAlfa(cor, emFoco ? 1 : 0.4)}
                strokeWidth={emFoco ? 3 : 1}
              >
                <title>{s.nome}</title>
              </path>
            );
          })}

          {/* Sempre no DOM: montar e desmontar não transiciona, e a troca de
              cena precisa ser interpolável para sobreviver a scroll rápido.
              Quem controla a visibilidade é o CSS, por `data-mapa-cena`. */}
          {PONTOS_ALAGAMENTO.map((p, i) => (
            <circle
              key={`${p.cx}-${p.cy}`}
              cx={p.cx}
              cy={p.cy}
              r={9}
              data-alagamento="true"
              style={{ '--i': i } as React.CSSProperties}
              fill={comAlfa(PALETA.azul, 0.9)}
              stroke={comAlfa(PALETA.azulProfundo, 1)}
              strokeWidth={2}
            />
          ))}

          {/* Temperatura em `<text>` no próprio viewBox: assim o rótulo
              acompanha o mapa em qualquer tamanho, sem depender de posição em
              % do container. Ilustrativo, como as faixas de risco. Sempre no
              DOM; quem esconde por cena é o CSS. */}
          {!compacta &&
            TEMPERATURAS.map((t, i) => (
              <text
                key={t.id}
                x={t.x}
                y={t.y}
                data-temperatura={t.id}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={52}
                fontWeight={600}
                // Rótulo é texto, não leitura do mapa: segue os tokens de tema
                // (e por isso continua legível quando o tema virar claro), em
                // vez de sair da `paleta.ts`, que rege polígonos e círculos.
                // O halo do `--bg-primary` garante contraste sobre qualquer
                // faixa de risco embaixo.
                fill="var(--text-primary)"
                stroke="var(--bg-primary)"
                strokeWidth={7}
                paintOrder="stroke"
                style={{ fontFamily: 'var(--font-mono)', '--i': i } as React.CSSProperties}
              >
                {t.valor}°
              </text>
            ))}

          {/* A Sé vira o foco a partir da cena 3, mas nada no mapa dizia onde
              ela fica. O rótulo entra junto com o foco. */}
          {!compacta && (
            <text
              x={ANCORA_FOCO.x}
              y={ANCORA_FOCO.y}
              data-rotulo-foco="true"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={40}
              fontWeight={600}
              fill="var(--text-primary)"
              stroke="var(--bg-primary)"
              strokeWidth={6}
              paintOrder="stroke"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {NOME_FOCO}
            </text>
          )}

          {/* Score entra na cena 3 junto com o foco. Vive no mesmo viewBox
              dos outros rótulos (não mais um <span> em HTML por cima do
              SVG): era exatamente a mistura de unidades — o número em % do
              container, o rótulo da Sé em unidades do viewBox — que fazia a
              folga entre os dois encolher mais rápido que a fonte fixa do
              rótulo numa coluna estreita, até colidir. Continua montando só
              na cena 'score' (diferente da temperatura e do rótulo da
              região, que ficam sempre no DOM porque persistem por várias
              cenas): o score é pontual, a cena 4 já muda o assunto para os
              pontos de alagamento.
              O valor renderizado é `score` (ver `useContagem`), que conta de
              0 até `SCORE_FOCO` enquanto a cena está ativa. */}
          {cena === 'score' && (
            <text
              x={CENTRO_FOCO.x}
              y={CENTRO_FOCO.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={TAMANHO_SCORE}
              fontWeight={700}
              fill={PALETA.amarelo}
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {score}
            </text>
          )}
        </g>
      </svg>

      {cena === 'alerta' && (
        <div
          role="status"
          className="absolute left-1/2 -translate-x-1/2 bottom-6 flex items-center gap-2 rounded-xl px-4 py-2.5"
          style={{
            background: comAlfa(PALETA.vermelho, 0.16),
            color: 'var(--cor-alerta)',
            border: `1px solid ${comAlfa(PALETA.vermelho, 0.5)}`,
          }}
        >
          <AlertTriangle size={18} className="flex-shrink-0" />
          <span className="text-sm font-medium">Risco alto na sua região</span>
        </div>
      )}
    </div>
  );
}
