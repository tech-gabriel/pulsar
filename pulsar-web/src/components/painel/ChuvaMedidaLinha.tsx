import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { Chuva24h, ChuvaMedida } from '../../types';
import { horaCurta } from '../../utils/data';
import { fraseChuvaMedida, km, mmMedido, nomeEstacao, ondeMediu } from '../../utils/chuvaMedida';
import FolhaInferior from '../ui/FolhaInferior';
import { deNomeDe } from '../../data/regioes-seo';

interface Props {
  nome: string;
  medida: ChuvaMedida | null | undefined;
  chuva24h?: Chuva24h | null;
  /** O número grande da área veio da chuva medida (num ponto dela): muda a frase de quando aqui está seco. */
  numeroPelaMedida?: boolean;
  /** A leitura é a da estação do trecho aberto, não a do centro da área: muda a explicação da folha. */
  doTrecho?: boolean;
  /** Chuva de 3 h da estação do trecho: sem chuva na última hora, a frase fala das 3 horas, como o topo do trecho. */
  mm3h?: number;
  /**
   * Área em Tranquilo com o número pela medida (opção B, crítica 8): uma faixa só, "Chuva medida",
   * com os mm de 3 h do ponto que mais choveu e uma linha sobre agora. "Ver postos" abre a folha.
   */
  calmaMm3h?: number;
}

const as = (verbo: string, iso: string) => { const h = horaCurta(iso); return h ? ` · ${verbo} às ${h}` : ''; };
const numero = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * Faixa "Medida agora" do bloco Chuva: o que o pluviômetro marcou e de quem é. É fato, não
 * estimativa, por isso vem antes da chuva do modelo. Posto marcando zero vira frase, não número.
 * O toque no posto abre a última hora, as 24 horas e o crédito. Some sem leitura que dê para afirmar.
 */
export default function ChuvaMedidaLinha({ nome, medida, chuva24h, numeroPelaMedida = false, doTrecho = false, mm3h, calmaMm3h }: Props) {
  const [aberta, setAberta] = useState(false);
  const frase = medida ? fraseChuvaMedida(medida) : null;
  if (calmaMm3h !== undefined) {
    const leitura = medida && frase;
    return (
      <>
        <div className="det-faixa">
          <div className="det-faixa-cab">
            <span className="det-faixa-nome">Chuva medida</span>
            {leitura && (
              <button type="button" className="det-faixa-de" onClick={() => setAberta(true)}>
                <span>Ver postos</span>
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="det-par um">
            <div><b>{numero(calmaMm3h)}<span>mm</span></b><i>{`em 3 h, no ponto ${deNomeDe(nome)} que mais choveu`}</i></div>
          </div>
          {leitura && (
            <p className="det-faixa-ponte">{`${frase} ${medida.fonte === 'cge' ? `no posto ${medida.posto}` : `na estação ${nomeEstacao(medida.posto)}`}.`}</p>
          )}
        </div>
        {leitura && <FolhaMedida nome={nome} medida={medida} chuva24h={chuva24h} doTrecho={false} aberta={aberta} onFechar={() => setAberta(false)} />}
      </>
    );
  }
  if (!medida || !frase) return null;

  const cge = medida.fonte === 'cge';
  const janelas = [
    medida.mm15 !== null && { mm: medida.mm15, quando: 'nos últimos 15 min' },
    medida.mm60 !== null && { mm: medida.mm60, quando: 'na última hora' },
  ].filter((j) => !!j);
  const choveu = janelas.some((j) => j.mm > 0);
  const fraseTresHoras = mm3h === undefined || choveu ? null
    : mm3h > 0 ? `Choveu ${mmMedido(mm3h)} nas últimas 3 horas` : 'Sem chuva nas últimas 3 horas';
  // O número grande diz que choveu num ponto da área e aqui está seco: se esta mesma estação
  // marcou chuva nas 24 horas, o certo é "parou", não um "sem chuva" que parece desmentir o topo.
  // Só no CEMADEN: o posto do CGE e uma estação do CEMADEN podem ter o mesmo nome ("Mooca") e
  // ser aparelhos diferentes.
  const parou = numeroPelaMedida && !cge && !choveu && !!chuva24h && chuva24h.estacao === medida.posto && chuva24h.mm > 0;

  return (
    <>
      <div className="det-faixa">
        <div className="det-faixa-cab">
          <span className="det-faixa-nome">Medida agora</span>
          <button type="button" className="det-faixa-de" onClick={() => setAberta(true)}>
            <span>{ondeMediu(medida)}</span>
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>
        {choveu ? (
          <div className="det-par">
            {janelas.map((j) => <div key={j.quando}><b>{numero(j.mm)}<span>mm</span></b><i>{j.quando}</i></div>)}
          </div>
        ) : <p className="det-faixa-frase">{parou ? 'Parou de chover aqui' : fraseTresHoras ?? frase}</p>}
        {/* Frase-ponte (15/11): o topo diz que choveu num ponto da área e este posto está seco. */}
        {numeroPelaMedida && !choveu && !parou && (
          <p className="det-faixa-ponte">{`A chuva forte foi em outro ponto ${deNomeDe(nome)}.`}</p>
        )}
      </div>

      <FolhaMedida nome={nome} medida={medida} chuva24h={chuva24h} doTrecho={doTrecho} aberta={aberta} onFechar={() => setAberta(false)} />
    </>
  );
}

/** A folha do toque: a última hora, as 24 horas e o crédito de quem mediu. */
function FolhaMedida({ nome, medida, chuva24h, doTrecho, aberta, onFechar }: {
  nome: string; medida: ChuvaMedida; chuva24h?: Chuva24h | null; doTrecho: boolean; aberta: boolean; onFechar: () => void;
}) {
  const cge = medida.fonte === 'cge';
  // O CEMADEN informa a hora da consulta, não a da medição: por isso "consultado", nunca "medido às".
  const quem = cge ? `CGE-SP · posto ${medida.posto}` : `CEMADEN · estação ${nomeEstacao(medida.posto)}`;
  const quando = as(cge ? 'lido' : 'consultado', medida.coletadoEm);
  const itens = [
    medida.mm15 !== null && { rotulo: 'Últimos 15 minutos', mm: medida.mm15, fonte: quem + quando },
    medida.mm60 !== null && { rotulo: 'Última hora', mm: medida.mm60, fonte: quem + (medida.mm15 === null ? quando : '') },
    chuva24h && { rotulo: 'Últimas 24 horas', mm: chuva24h.mm, fonte: `CEMADEN · estação ${chuva24h.estacao}${as('consultado', chuva24h.medidoEm)}` },
  ].filter((i) => !!i);
  const credito = [
    cge && 'do CGE da Prefeitura de São Paulo',
    (!cge || chuva24h) && 'da rede observacional do CEMADEN/MCTIC',
  ].filter(Boolean).join(' e ');
  return (
      <FolhaInferior aberta={aberta} onFechar={onFechar} tituloId="titulo-folha-medida">
        <h2 id="titulo-folha-medida" style={{ font: '700 18px var(--font-heading)', color: 'var(--text-primary)' }}>Chuva medida em {nome}</h2>
        <p className="mt-0.5 mb-2.5" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {medida.vizinho ? 'Medida no posto mais próximo, de outra região. Não é previsão.'
            : doTrecho ? `Medida ${cge ? 'no posto' : 'na estação'} mais perto deste trecho${medida.distanciaKm != null ? `, a ${km(medida.distanciaKm)}` : ''}. Não é previsão.`
            : !cge ? `Medida na estação mais perto do centro ${deNomeDe(nome)}${medida.distanciaKm != null ? `, a ${km(medida.distanciaKm)}` : ''}. Não é previsão.`
            : 'Medida por pluviômetro, não é previsão.'}
        </p>
        {itens.map((i) => (
          <div key={i.rotulo} className="med-item">
            <span className="det-medida-fonte">{i.rotulo}</span>
            <b>{mmMedido(i.mm)}</b>
            <span className="det-medida-fonte">{i.fonte}</span>
          </div>
        ))}
        <p className="det-medida-fonte mt-2.5 mb-4">Dados {credito}.</p>
        <button type="button" data-foco-inicial onClick={onFechar}
          className="w-full min-h-[50px] rounded-[14px] inline-flex items-center justify-center"
          style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', fontWeight: 600, fontSize: 15 }}>
          Fechar
        </button>
      </FolhaInferior>
  );
}
