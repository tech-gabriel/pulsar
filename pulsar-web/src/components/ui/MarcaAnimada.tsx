import svg from '../../assets/logos/pulsar-icone-animado.svg?raw';

/**
 * O ícone do Pulsar com a animação da marca (o núcleo acende, os arcos se desenham e, depois,
 * uma onda de luz a cada 4 s). SVG em linha e não <img>: cada montagem recomeça a animação.
 * Quem pede menos movimento no sistema vê o ícone parado (regra dentro do próprio SVG).
 */
export default function MarcaAnimada({ tamanho }: { tamanho: number }) {
  // Conteúdo fixo do próprio repositório (asset de build), não vem de usuário.
  return <span aria-hidden="true" className="block [&>svg]:w-full [&>svg]:h-full" style={{ width: tamanho, height: tamanho }} dangerouslySetInnerHTML={{ __html: svg }} />;
}
