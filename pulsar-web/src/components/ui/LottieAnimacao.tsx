import { Component, lazy, Suspense, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import type { LottieComponentProps } from 'lottie-react';
import { usePrefereMenosMovimento } from '../../hooks/usePrefereMenosMovimento';

/**
 * Animações disponíveis. Cada nome aponta para um JSON em `assets/lottie`.
 *  - `radar`: monitoramento em curso, para "o dado ainda não chegou"
 *  - `gota`: contexto de alagamento
 *  - `buscaVazia`: procurou e não encontrou (não confundir com `radar`, que
 *    diria "monitorando" numa tela em que ninguém está monitorando nada)
 */
export type NomeAnimacao = 'radar' | 'gota' | 'buscaVazia';

/**
 * O player (lottie-web por baixo) pesa dezenas de kB: entra por chunk separado,
 * só quando algum estado vazio realmente aparece na tela.
 *
 * O desembrulho existe porque dev e produção entregam formatos diferentes: o
 * otimizador do Vite empacota o build UMD do lottie-react (campo `main`), então
 * em dev `default` é o objeto de exports do CJS (`{ default: Lottie, ... }`);
 * no build de produção o campo `module` resolve para ESM e `default` já é o
 * componente. Sem isto, funciona num e quebra no outro.
 */
const Player = lazy(async () => {
  const mod: unknown = await import('lottie-react');
  const nivel1 = (mod as { default?: unknown }).default ?? mod;
  const componente = typeof nivel1 === 'function'
    ? nivel1
    : (nivel1 as { default?: unknown }).default;
  return { default: componente as ComponentType<LottieComponentProps> };
});

// O JSON também é carregado sob demanda, um chunk por animação.
const FONTES: Record<NomeAnimacao, () => Promise<{ default: unknown }>> = {
  radar: () => import('../../assets/lottie/radar-pulso.json'),
  gota: () => import('../../assets/lottie/gota.json'),
  buscaVazia: () => import('../../assets/lottie/busca-vazia.json'),
};

/**
 * Isola o player: se o lottie-web quebrar ao renderizar (ambiente sem canvas,
 * JSON malformado, chunk corrompido), a animação é decorativa e não pode levar
 * a página junto. Cai no conteúdo alternativo e segue.
 */
class FronteiraDeErro extends Component<{ alternativa: ReactNode; children: ReactNode }, { falhou: boolean }> {
  state = { falhou: false };

  static getDerivedStateFromError() {
    return { falhou: true };
  }

  render() {
    return this.state.falhou ? this.props.alternativa : this.props.children;
  }
}

interface Props {
  nome: NomeAnimacao;
  /** Lado da caixa em px (a animação é quadrada). */
  tamanho?: number;
  /** Exibido enquanto carrega e sempre que a animação não puder aparecer. */
  fallback?: ReactNode;
  className?: string;
}

/**
 * Animação ilustrativa (decorativa) carregada sob demanda.
 *
 * Decisões que valem lembrar:
 * - É `aria-hidden`: a informação vive no texto ao lado, nunca só na animação.
 * - Com `prefers-reduced-motion` a animação congela no primeiro quadro em vez
 *   de sumir, mantendo a composição da tela. O `MotionConfig` global não cobre
 *   isto, porque o Lottie não passa pelo motion.
 * - Falha de import, de chunk ou de render cai no `fallback` (o ícone de
 *   sempre), sem buraco no layout e sem derrubar a tela.
 */
export default function LottieAnimacao({ nome, tamanho = 96, fallback = null, className = '' }: Props) {
  const reduzir = usePrefereMenosMovimento();
  // O nome carregado viaja junto do dado: se a prop mudar, o render antigo não
  // vaza enquanto o novo JSON não chega, e o efeito não precisa limpar estado
  // de forma síncrona (o que dispararia render em cascata).
  const [carga, setCarga] = useState<{ nome: NomeAnimacao; dados: unknown } | { nome: NomeAnimacao; erro: true } | null>(null);

  useEffect(() => {
    let vivo = true;
    FONTES[nome]()
      .then((m) => { if (vivo) setCarga({ nome, dados: m.default }); })
      .catch(() => { if (vivo) setCarga({ nome, erro: true }); });
    return () => { vivo = false; };
  }, [nome]);

  const caixa = { width: tamanho, height: tamanho };
  const pronta = carga?.nome === nome ? carga : null;
  const dados = pronta && 'dados' in pronta ? pronta.dados : null;

  // Reserva a caixa (mesmo em erro) para não deslocar o texto abaixo.
  const alternativa = (
    <div style={caixa} className={`flex items-center justify-center ${className}`} aria-hidden>
      {fallback}
    </div>
  );

  if (!dados) return alternativa;

  return (
    <div style={caixa} className={className} aria-hidden>
      <FronteiraDeErro alternativa={alternativa}>
        <Suspense fallback={alternativa}>
          <Player animationData={dados} loop={!reduzir} autoplay={!reduzir} style={caixa} />
        </Suspense>
      </FronteiraDeErro>
    </div>
  );
}
