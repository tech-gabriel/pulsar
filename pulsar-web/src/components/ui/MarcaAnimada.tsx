import { useEffect, useState } from 'react';
import icone from '../../assets/logos/pulsar-icone-animado.svg?raw';
import simbolo from '../../assets/logos/pulsar-simbolo-animado.svg?raw';

// A abertura (núcleo acende, arcos se desenham) do símbolo do cabeçalho toca uma vez por visita:
// o cabeçalho remonta a cada página, e repetir a abertura a cada clique cansaria.
let simboloJaAbriu = false;

/**
 * A marca do Pulsar animada: abre uma vez e depois emite uma onda de luz a cada 4 s.
 * `icone` é o quadrado azul (onboarding); `simbolo` é o símbolo transparente (cabeçalho);
 * `simbolo-branco` é o mesmo símbolo em branco, sobre o azul (login), e sempre abre.
 * SVG em linha e não <img>: cada montagem recomeça a animação. Quem pede menos movimento
 * no sistema vê a marca parada (regra dentro do próprio SVG).
 */
export default function MarcaAnimada({ tamanho, variante = 'icone', className }: { tamanho: number; variante?: 'icone' | 'simbolo' | 'simbolo-branco'; className?: string }) {
  const [semAbertura] = useState(() => variante === 'simbolo' && simboloJaAbriu);
  useEffect(() => { if (variante === 'simbolo') simboloJaAbriu = true; }, [variante]);
  const html = variante === 'icone' ? icone
    : variante === 'simbolo-branco' ? simbolo.replaceAll('#00A6F4', '#FFFFFF')
    : semAbertura ? simbolo.replace('class="simbolo-anim"', 'class="simbolo-anim sem-abertura"') : simbolo;
  // Conteúdo fixo do próprio repositório (asset de build), não vem de usuário.
  return <span aria-hidden="true" className={['block flex-shrink-0 [&>svg]:w-full [&>svg]:h-full', className].filter(Boolean).join(' ')} style={{ width: tamanho, height: tamanho }} dangerouslySetInnerHTML={{ __html: html }} />;
}
