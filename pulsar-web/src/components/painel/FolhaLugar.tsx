import { useEffect, useRef } from 'react';
import { BriefcaseBusiness, Cloud, CloudRain, Droplets, House, Route, X } from 'lucide-react';
import type { LocalSalvoDto, SubprefeituraMapaDto } from '../../types';
import { usePrevisaoSubprefeitura } from '../../hooks/usePrevisaoSubprefeitura';
import { estiloCamada } from '../../utils/camadas';
import { fundoParaTextoBranco, opaca } from '../../utils/contraste';
import { ROTULO_TIPO } from '../../features/locais/regras';
import { fraseAlagamento, fraseChuvaAgora, fraseDoRisco, intensidadeChuva } from '../../features/locais/estadoLugar';
import { deNomeDe } from '../../data/regioes-seo';
import { Skeleton } from '../ui/Skeleton';

interface Props {
  local: LocalSalvoDto;
  /** A subprefeitura do lugar; undefined enquanto carrega ou se a coleta falhou. */
  area: SubprefeituraMapaDto | undefined;
  /** As áreas ainda estão chegando: sem área, mostra o esqueleto e não "Sem leitura". */
  carregando?: boolean;
  onFechar: () => void;
  onVerRegiao: () => void;
  onRota: () => void;
}

/**
 * O estado de agora na casa ou no trabalho (F4b). Chuva, risco e alagamento são da
 * subprefeitura, e a nota diz isso: nada aqui foi medido na porta da casa.
 * Não é modal (o mapa segue tocável), mas recebe o foco ao abrir, fecha com Esc e devolve o
 * foco ao marcador do mapa.
 */
export default function FolhaLugar({ local, area, carregando = false, onFechar, onVerRegiao, onRota }: Props) {
  // Hook sempre chamado (regra dos hooks); sem área, a previsão não entra na frase.
  const { faixas, erro } = usePrevisaoSubprefeitura(area?.id ?? local.subprefeituraId);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const casa = local.tipo === 'CASA';
  const Icone = casa ? House : BriefcaseBusiness;
  const regiao = area?.nome ?? local.subprefeituraNome;
  const leitura = area?.ultimaLeitura ?? null;
  const chuvendo = intensidadeChuva(leitura?.chuvaMmH) !== null;
  const score = area?.scoreAtual ?? null;
  const corScore = area && score ? fundoParaTextoBranco(opaca(estiloCamada(area, 'score').corCirculo)) : undefined;
  const alagado = (area?.alagamentosCge?.length ?? 0) > 0;
  const tituloId = `folha-lugar-${local.tipo.toLowerCase()}`;
  const esperando = !area && carregando;

  const fecharRef = useRef<() => void>(() => {});
  useEffect(() => {
    fecharRef.current = () => {
      onFechar();
      // O marcador pode trocar de ponto para etiqueta no caminho: busca no quadro seguinte.
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>(`.lugar-marcador[data-lugar="${local.tipo}"]`)?.focus({ preventScroll: true }));
    };
  });

  useEffect(() => {
    tituloRef.current?.focus({ preventScroll: true });
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fecharRef.current();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, []);

  return (
    <section role="dialog" aria-labelledby={tituloId} className="flex flex-col gap-2.5 px-4 pt-2 pb-4">
      <span aria-hidden="true" className="md:hidden w-9 h-[5px] rounded-full mx-auto flex-shrink-0"
        style={{ background: 'color-mix(in srgb, var(--text-primary) 22%, transparent)' }} />

      <header className="flex items-center gap-2.5">
        <span aria-hidden="true" className="grid place-items-center w-[30px] h-[30px] rounded-full flex-shrink-0"
          style={{ background: 'var(--color-pulsar-600)', color: '#fff' }}>
          <Icone size={15} strokeWidth={2.25} />
        </span>
        <div className="flex-1 min-w-0">
          <h2 id={tituloId} ref={tituloRef} tabIndex={-1} className="outline-none"
            style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16, lineHeight: 1.2, color: 'var(--text-primary)' }}>
            {ROTULO_TIPO[local.tipo]}
          </h2>
          <p className="truncate" style={{ fontSize: 13, lineHeight: 1.3, color: 'var(--text-secondary)' }}>{local.rotulo}</p>
        </div>
        <button type="button" onClick={() => fecharRef.current()} aria-label="Fechar"
          className="grid place-items-center w-11 h-11 -mr-2 rounded-full" style={{ color: 'var(--text-secondary)' }}>
          <X size={18} />
        </button>
      </header>

      <div aria-hidden="true" className="h-px" style={{ background: 'var(--border-glass)' }} />

      {/* Alagamento ativo é o que muda o plano: sobe para o topo, com fundo de alerta. */}
      {alagado && area && (
        <p className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
          style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3, color: 'var(--cor-alerta)', background: 'color-mix(in srgb, var(--cor-alerta) 12%, transparent)' }}>
          <Droplets size={17} aria-hidden="true" className="flex-shrink-0" />
          {fraseAlagamento(area.alagamentosCge, regiao)}
        </p>
      )}

      {esperando ? (
        <div aria-label="Carregando a leitura" role="status" className="flex flex-col gap-3 py-0.5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-44" />
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5" style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, color: 'var(--text-primary)' }}>
          <li className="flex items-center gap-2.5">
            <span aria-hidden="true" className="grid place-items-center w-5 flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
              {chuvendo ? <CloudRain size={17} /> : <Cloud size={17} />}
            </span>
            {fraseChuvaAgora(leitura?.chuvaMmH, leitura !== null)}
          </li>
          <li className="flex items-center gap-2.5">
            <span aria-hidden="true" className="grid place-items-center w-5 flex-shrink-0">
              {score && corScore ? (
                <span className="grid place-items-center w-5 h-5 rounded-full"
                  style={{ background: corScore, color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 700 }}>
                  {Math.round(score.valor)}
                </span>
              ) : <span className="w-2 h-2 rounded-full" style={{ background: 'var(--text-muted)' }} />}
            </span>
            {area && score
              ? `${NOME_RISCO[area.faixaRisco]}, ${primeiraMinuscula(fraseDoRisco(area, erro ? [] : faixas))}`
              : 'Sem leitura agora'}
          </li>
          {!alagado && (
            <li className="flex items-center gap-2.5">
              <span aria-hidden="true" className="grid place-items-center w-5 flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                <Droplets size={17} />
              </span>
              {/* Sem dado da região não se afirma "nenhum alagamento". */}
              {area ? fraseAlagamento(area.alagamentosCge, regiao) : 'Sem leitura agora'}
            </li>
          )}
        </ul>
      )}

      <p style={{ fontSize: 12, lineHeight: 1.4, color: 'var(--text-secondary)' }}>
        Chuva e risco são {deNomeDe(regiao)}, a região {casa ? 'da sua casa' : 'do seu trabalho'}.
      </p>

      <div className="flex gap-2">
        <button type="button" onClick={onVerRegiao}
          className="flex-1 min-h-[44px] rounded-xl font-semibold"
          style={{ fontSize: 14, color: 'color-mix(in srgb, var(--text-accent) 70%, var(--text-primary))', background: 'color-mix(in srgb, var(--text-accent) 12%, transparent)' }}>
          Ver {regiao}
        </button>
        <button type="button" onClick={onRota}
          className="flex-1 min-h-[44px] rounded-xl font-semibold inline-flex items-center justify-center gap-1.5"
          style={{ fontSize: 14, color: '#fff', background: 'var(--color-pulsar-700)' }}>
          <Route size={15} aria-hidden="true" />
          Rota até aqui
        </button>
      </div>
    </section>
  );
}

/** Os mesmos nomes de faixa da lista e do detalhe. */
const NOME_RISCO = { BAIXO: 'Tudo tranquilo', MODERADO: 'Atenção', ALTO: 'Alerta' } as const;
const primeiraMinuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
