import { useState } from 'react';
import { ChevronRight, Gauge } from 'lucide-react';
import type { Chuva24h, ChuvaMedida } from '../../types';
import { horaCurta } from '../../utils/data';
import { fraseChuvaMedida, mmMedido } from '../../utils/chuvaMedida';
import FolhaInferior from '../ui/FolhaInferior';

interface Props {
  nome: string;
  medida: ChuvaMedida | null | undefined;
  chuva24h?: Chuva24h | null;
}

const as = (verbo: string, iso: string) => { const h = horaCurta(iso); return h ? ` · ${verbo} às ${h}` : ''; };

/**
 * Chuva medida por pluviômetro (AS7). É fato, não estimativa: por isso fica logo abaixo do risco.
 * Na tela vai uma frase só (pedido do user: nada que pese ou confunda); quem mediu, a última hora,
 * as 24 horas e o crédito do CEMADEN abrem no toque. Some sem leitura que dê para afirmar.
 */
export default function ChuvaMedidaLinha({ nome, medida, chuva24h }: Props) {
  const [aberta, setAberta] = useState(false);
  const frase = medida ? fraseChuvaMedida(medida) : null;
  if (!medida || !frase) return null;

  const cge = medida.fonte === 'cge';
  // O CEMADEN informa a hora da consulta, não a da medição: por isso "consultado", nunca "medido às".
  const quem = cge ? `CGE-SP · posto ${medida.posto}` : `CEMADEN · estação ${medida.posto}`;
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
    <>
      <button type="button" className="det-bloco det-medida" onClick={() => setAberta(true)}>
        <span className="det-medida-v"><Gauge size={14} aria-hidden="true" />{frase}</span>
        <span className="det-medida-fonte det-medida-mais">medido<ChevronRight size={14} aria-hidden="true" /></span>
      </button>

      <FolhaInferior aberta={aberta} onFechar={() => setAberta(false)} tituloId="titulo-folha-medida">
        <h2 id="titulo-folha-medida" style={{ font: '700 18px var(--font-heading)', color: 'var(--text-primary)' }}>Chuva medida em {nome}</h2>
        <p className="mt-0.5 mb-2.5" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {medida.vizinho ? 'Medida no posto mais próximo. Não é previsão.' : 'Medida por pluviômetro, não é previsão.'}
        </p>
        {itens.map((i) => (
          <div key={i.rotulo} className="med-item">
            <span className="det-medida-fonte">{i.rotulo}</span>
            <b>{mmMedido(i.mm)}</b>
            <span className="det-medida-fonte">{i.fonte}</span>
          </div>
        ))}
        <p className="det-medida-fonte mt-2.5 mb-4">Dados {credito}.</p>
        <button type="button" data-foco-inicial onClick={() => setAberta(false)}
          className="w-full min-h-[50px] rounded-[14px] inline-flex items-center justify-center"
          style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', fontWeight: 600, fontSize: 15 }}>
          Fechar
        </button>
      </FolhaInferior>
    </>
  );
}
