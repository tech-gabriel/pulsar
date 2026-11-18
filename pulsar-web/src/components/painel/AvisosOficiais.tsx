import { useState } from 'react';
import { ChevronRight, Megaphone } from 'lucide-react';
import type { AlertaOficial } from '../../types';
import { horaCurta } from '../../utils/data';
import { emissorCurto, emissorLegivel, eventoLegivel, nivelOficial, porGravidade } from '../../utils/alertaOficial';
import FolhaInferior from '../ui/FolhaInferior';

/** Selo do nível oficial: o desenho do BadgeRisco, com a cor da escala da Defesa Civil na bolinha. */
export function SeloNivelOficial({ gravidade }: { gravidade: string }) {
  const nivel = nivelOficial(gravidade);
  return <span className={`dc-selo dc-${nivel.cor}`}>{nivel.rotulo}</span>;
}

/** A linha do detalhe fechado (no lugar da linha do CGE): o alerta mais grave da área. */
export function LinhaAvisoOficial({ alertas }: { alertas: AlertaOficial[] | undefined }) {
  if (!alertas || alertas.length === 0) return null;
  const a = porGravidade(alertas)[0];
  const nivel = nivelOficial(a.gravidade);
  return (
    <p className={`det-linha dc-linha dc-${nivel.cor}`}>
      <Megaphone size={17} aria-hidden="true" />
      <span className="dc-texto">{`Defesa Civil: ${eventoLegivel(a.evento).toLocaleLowerCase('pt-BR')} até ${horaCurta(a.expiraUtc)}`}</span>
      <SeloNivelOficial gravidade={a.gravidade} />
    </p>
  );
}

/**
 * Alertas oficiais da Defesa Civil valendo na área (escolha do user, 18/11/2026): uma linha por alerta no
 * cartão da Chuva, e o alerta completo, com o texto exatamente como a Defesa Civil mandou, na folha que
 * sobe de baixo. Some sozinho sem alerta.
 */
export default function AvisosOficiais({ alertas }: { alertas: AlertaOficial[] | undefined }) {
  const [aberto, setAberto] = useState<AlertaOficial | null>(null);
  if (!alertas || alertas.length === 0) return null;

  return (
    <section className="det-sec" aria-labelledby="titulo-avisos-oficiais">
      <h3 id="titulo-avisos-oficiais" className="det-t">Avisos oficiais</h3>
      <div className="det-bloco">
        {porGravidade(alertas).map((a) => (
          <div key={a.identificador} className="det-faixa">
            <button type="button" className="dc-linha-alerta" onClick={() => setAberto(a)}
              aria-label={`${eventoLegivel(a.evento)}, alerta ${nivelOficial(a.gravidade).rotulo.toLocaleLowerCase('pt-BR')} da ${emissorCurto(a.emissor)}, até ${horaCurta(a.expiraUtc)}. Ler o alerta completo`}>
              <span>
                <b>{eventoLegivel(a.evento)}</b>
                <small>{`${emissorCurto(a.emissor)} · até ${horaCurta(a.expiraUtc)}`}</small>
              </span>
              <SeloNivelOficial gravidade={a.gravidade} />
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      <FolhaInferior aberta={aberto !== null} onFechar={() => setAberto(null)} tituloId="titulo-folha-alerta">
        {aberto && (
          <>
            <div className="dc-folha-cab">
              <h2 id="titulo-folha-alerta">{eventoLegivel(aberto.evento)}</h2>
              <SeloNivelOficial gravidade={aberto.gravidade} />
            </div>
            <p className="dc-folha-de">{`${emissorLegivel(aberto.emissor)} · de ${horaCurta(aberto.inicioUtc)} até ${horaCurta(aberto.expiraUtc)}`}</p>
            <p className="dc-folha-texto">{aberto.descricao || aberto.titulo}</p>
            {aberto.instrucao && <p className="dc-folha-instrucao">{aberto.instrucao}</p>}
            <button type="button" data-foco-inicial onClick={() => setAberto(null)}
              className="w-full min-h-[50px] mt-4 rounded-[14px] inline-flex items-center justify-center"
              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', fontWeight: 600, fontSize: 15 }}>
              Fechar
            </button>
          </>
        )}
      </FolhaInferior>
    </section>
  );
}
