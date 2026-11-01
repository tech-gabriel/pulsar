import { CHUVA_FORTE_MM, chuvaForte } from '../../utils/previsao';
import type { FaixaPrevisaoDto } from '../../types';

// Acima disto a coleta está quebrada há pelo menos duas horas (a guarda do backend é de
// 55 min), e aí a idade do dado é informação e não decoração: previsão velha passando
// por atual é pior do que não mostrar previsão nenhuma.
const IDADE_MAXIMA_MS = 3 * 60 * 60 * 1000;
// Altura útil da barra mais alta, em px.
const ALTURA = 72;

interface Props {
  faixas: FaixaPrevisaoDto[];
  erro: string | null;
}

// Fuso do navegador de propósito: o backend grava UTC, com o Z na string, e a exibição
// converte. Nada aqui pode fixar America/Sao_Paulo, que deixaria de valer na próxima cidade.
function hora(iso: string): string {
  return `${new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', hour12: false })}h`;
}

function horaMinuto(ms: number): string {
  return new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

const mm = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * Idade da coleta contra o relógio. O `Date.now()` mora aqui dentro, e não no corpo do
 * componente: a regra de pureza do React Compiler recusa leitura de relógio durante o render.
 */
function coletaVelha(coletadoEmMs: number): boolean {
  return Date.now() - coletadoEmMs > IDADE_MAXIMA_MS;
}

/**
 * Chuva prevista das próximas horas em barras. A escala nunca fica abaixo do limiar de chuva
 * forte: num dia seco, 1,6 mm não pode virar uma barra cheia e parecer temporal.
 */
export default function PrevisaoFaixa({ faixas, erro }: Props) {
  // Sem faixa futura a seção não existe, em vez de existir vazia. É o estado real nos
  // primeiros minutos depois do deploy, e casca vazia parece bug.
  if (erro || faixas.length === 0) return null;

  // A coleta MAIS ANTIGA decide a idade, o mesmo critério do backend dentro da faixa: cada
  // número pode vir justamente da sub mais atrasada, e carimbar com a mais recente calaria
  // o aviso na hora em que ele mais importa.
  const coletaMaisAntiga = faixas.reduce((min, f) => Math.min(min, new Date(f.coletadoEm).getTime()), Number.POSITIVE_INFINITY);
  const velha = coletaVelha(coletaMaisAntiga);
  const escala = Math.max(CHUVA_FORTE_MM, ...faixas.map((f) => f.chuvaMm));

  return (
    <section className="det-secao" aria-label="Chuva prevista nas próximas horas">
      <div className="det-secao-cab">
        <h3 className="det-rotulo">Próximas horas</h3>
        {velha && <span className="det-nota">{`previsão de ${horaMinuto(coletaMaisAntiga)}`}</span>}
      </div>
      <ul className="det-bloco prev-barras" style={{ gridTemplateColumns: `repeat(${faixas.length}, minmax(0, 1fr))` }}>
        {faixas.map((f) => {
          const forte = chuvaForte(f);
          return (
            <li key={f.instantePrevisto} data-testid="faixa-previsao" data-destaque={forte} title={f.condicaoDescricao}
              className={forte ? 'prev-barra forte' : 'prev-barra'}>
              <span className="prev-valor" aria-hidden="true">{f.chuvaMm > 0 ? mm(f.chuvaMm) : ''}</span>
              <i style={{ height: Math.max(3, (f.chuvaMm / escala) * ALTURA) }} aria-hidden="true" />
              <span className="prev-hora">{hora(f.instantePrevisto)}</span>
              {/* A barra forte se distingue pela cor; o texto diz o mesmo a quem não vê a cor
                  (WCAG 1.4.1), e leva a condição, que no toque nunca aparece pelo title. */}
              <span className="sr-only">
                {`${mm(f.chuvaMm)} mm, ${forte ? `chuva forte prevista, ${f.condicaoDescricao}` : f.condicaoDescricao}`}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
