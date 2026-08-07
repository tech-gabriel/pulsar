import { AlertTriangle } from 'lucide-react';
import type { RegiaoDto } from '../../types';
import { coresParaFaixa, labelFaixa } from '../../utils/risco';
import { fundoParaTextoBranco } from '../../utils/contraste';
import BotaoFavorito from './BotaoFavorito';

interface Props {
  regiao: RegiaoDto;
  ativa: boolean;
  favorito: boolean;
  onSelecionar: () => void;
  onToggleFavorito: () => void;
}

/** Card glassmorphism de uma região na lista do painel (ETAPA 4.2). */
export default function RegiaoCard({ regiao, ativa, favorito, onSelecionar, onToggleFavorito }: Props) {
  const cores = coresParaFaixa(regiao.faixaRisco);
  const alto = regiao.scoreAgregado > 60;

  // O card inteiro é clicável, mas o favorito é uma ação própria: em vez de
  // aninhar um <button> dentro do outro (HTML inválido, e leitor de tela e
  // teclado ficam ambíguos), o alvo principal é um botão em camada sobre o
  // card e o conteúdo fica por cima, sem capturar ponteiro. Só o favorito
  // volta a receber cliques.
  const resumo = `${regiao.nome}, risco ${labelFaixa(regiao.faixaRisco).toLowerCase()}, score ${regiao.scoreAgregado.toFixed(0)}, ${regiao.totalSubprefeituras} ${regiao.totalSubprefeituras === 1 ? 'subprefeitura' : 'subprefeituras'}`;

  return (
    <div
      className={['regiao-card relative w-full text-left', ativa ? 'regiao-card-ativa' : ''].join(' ')}
      style={alto ? { borderLeft: '3px solid #ef4444' } : undefined}
    >
      <button
        type="button"
        onClick={onSelecionar}
        aria-label={resumo}
        className="absolute inset-0 z-0 w-full h-full rounded-[inherit] cursor-pointer"
      />

      {/* Linha 1: nome + favorito */}
      <div className="relative z-10 pointer-events-none flex items-center justify-between gap-2">
        <span
          className="truncate text-pulsar-50"
          style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15 }}
        >
          {regiao.nome}
        </span>
        <span className="pointer-events-auto flex-shrink-0">
          <BotaoFavorito ativo={favorito} onToggle={onToggleFavorito} size={16} />
        </span>
      </div>

      {/* Linha 2: score pill + faixa + contagem */}
      <div className="relative z-10 pointer-events-none flex items-center gap-2 mt-2" aria-hidden>
        <span
          className="inline-flex items-center justify-center rounded-full"
          style={{
            background: fundoParaTextoBranco(cores.fill),
            color: '#FFFFFF',
            padding: '4px 10px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: 14,
            boxShadow: `0 0 10px ${cores.fill}66`,
          }}
        >
          {regiao.scoreAgregado.toFixed(0)}
        </span>
        <span className="text-xs font-medium" style={{ color: cores.fill }}>
          {labelFaixa(regiao.faixaRisco)}
        </span>
        <span className="ml-auto text-xs text-pulsar-300">
          {regiao.totalSubprefeituras} {regiao.totalSubprefeituras === 1 ? 'subprefeitura' : 'subprefeituras'}
        </span>
      </div>

      {/* Linha 3: aviso resumido quando risco alto */}
      {alto && (
        <div className="relative z-10 pointer-events-none flex items-center gap-1.5 mt-2 text-pulsar-200" style={{ fontSize: 12 }}>
          <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />
          <span className="truncate">Condições severas, confira as recomendações.</span>
        </div>
      )}
    </div>
  );
}
