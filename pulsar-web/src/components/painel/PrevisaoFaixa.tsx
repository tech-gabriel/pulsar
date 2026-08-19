import { usePrevisaoRegiao } from '../../hooks/usePrevisaoRegiao';
import { iconeCondicao, corCondicao } from './iconeCondicao';
import { PALETA, comAlfa } from '../../utils/paleta';
import type { FaixaPrevisaoDto } from '../../types';

// Espelham LimiaresNotificacao no backend (ChuvaFortePrevistaMm e ProbabilidadeMinima):
// o destaque visual tem que marcar a mesma faixa que dispara o push, senão o app e a
// notificação contam histórias diferentes sobre o mesmo dia. É duplicação entre dois
// runtimes de propósito, porque a alternativa seria servir limiar por endpoint só para
// pintar uma borda. Quem recalibrar os limiares do push (frentes N1/N2) muda os dois.
const CHUVA_FORTE_MM = 10;
const PROBABILIDADE_MINIMA = 0.6;

// Acima disto a coleta está quebrada há pelo menos duas horas (a guarda do backend é de
// 55 min), e aí a idade do dado é informação e não decoração: previsão velha passando
// por atual é pior do que não mostrar previsão nenhuma.
const IDADE_MAXIMA_MS = 3 * 60 * 60 * 1000;

interface Props {
  regiaoId: string;
}

// Fuso do navegador de propósito: o backend grava UTC, com o Z na string, e a exibição
// converte. Nada aqui pode fixar America/Sao_Paulo, que deixaria de valer na próxima cidade.
function hora(iso: string): string {
  return `${new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', hour12: false })}h`;
}

function horaMinuto(ms: number): string {
  return new Date(ms).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Idade da coleta contra o relógio. O `Date.now()` mora aqui dentro, e não no corpo do
 * componente, como em PainelLateral.minutosAtras: a regra de pureza do React Compiler
 * recusa leitura de relógio durante o render, e não há como saber "agora" sem ela.
 */
function coletaVelha(coletadoEmMs: number): boolean {
  return Date.now() - coletadoEmMs > IDADE_MAXIMA_MS;
}

function destacar(f: FaixaPrevisaoDto): boolean {
  // probabilidadeChuva é fração de 0 a 1, e não porcentagem: comparar com 60 aqui
  // faria o destaque nunca acontecer.
  return f.chuvaMm >= CHUVA_FORTE_MM && f.probabilidadeChuva >= PROBABILIDADE_MINIMA;
}

export default function PrevisaoFaixa({ regiaoId }: Props) {
  const { faixas, erro } = usePrevisaoRegiao(regiaoId);

  // Sem faixa futura a seção não existe, em vez de existir vazia. É o estado real nos
  // primeiros minutos depois do deploy, e casca vazia parece bug.
  if (erro || faixas.length === 0) return null;

  // A coleta MAIS ANTIGA decide a idade, e é o mesmo critério que o backend já aplica
  // dentro da faixa (o ColetadoEm do DTO é o mínimo entre as subs). A razão é a
  // agregação: cada número exibido é o PIOR CASO entre as subprefeituras, então pode vir
  // justamente da sub mais atrasada. Carimbar a faixa com a coleta mais recente afirmaria
  // atualidade para número que veio de dado velho, e calaria o aviso na hora em que ele
  // mais importa. As coletas divergem de verdade: a guarda de 55 min pula uma sub, e uma
  // sub que falha seguido fica horas para trás.
  const coletaMaisAntiga = faixas.reduce(
    (min, f) => Math.min(min, new Date(f.coletadoEm).getTime()),
    Number.POSITIVE_INFINITY,
  );
  const velha = coletaVelha(coletaMaisAntiga);

  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between mb-2 gap-2">
        <h3
          className="text-pulsar-100"
          style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 14 }}
        >
          Próximas horas
        </h3>
        {velha && (
          <span
            className="text-pulsar-300 flex-shrink-0"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}
          >
            {`previsão de ${horaMinuto(coletaMaisAntiga)}`}
          </span>
        )}
      </div>

      {/* Rolagem horizontal: no celular o painel é estreito e oito faixas não cabem. */}
      <ul className="flex gap-1.5 overflow-x-auto pb-1 painel-scroll list-none m-0 p-0">
        {faixas.map((f) => {
          const Icone = iconeCondicao(f.condicaoCodigo);
          const emDestaque = destacar(f);

          return (
            <li
              key={f.instantePrevisto}
              data-testid="faixa-previsao"
              data-destaque={emDestaque}
              title={f.condicaoDescricao}
              className="painel-card-glass flex flex-col items-center gap-1 px-2.5 py-2 rounded-[10px] flex-shrink-0"
              style={
                emDestaque
                  ? {
                      border: `1px solid ${comAlfa(PALETA.vermelho, 0.35)}`,
                      background: comAlfa(PALETA.vermelho, 0.08),
                    }
                  : undefined
              }
            >
              <span
                className="text-pulsar-200"
                style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}
              >
                {hora(f.instantePrevisto)}
              </span>
              <Icone size={16} color={corCondicao(f.condicaoCodigo)} aria-hidden />
              <span
                className="text-pulsar-50"
                style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600 }}
              >
                {`${f.chuvaMm.toFixed(1)} mm`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
