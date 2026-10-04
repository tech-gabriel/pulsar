import type { ReactNode } from 'react';
import { rotuloPerigo, type ResumoCidade } from './areas';
import './cidade.css';

interface Props {
  resumo: ResumoCidade;
  cidadeNome: string;
  /** Barra alto/moderado/baixo (dashboard). */
  distribuicao?: boolean;
  /** Slot à direita (o mapa coroplético no dashboard). */
  children?: ReactNode;
}

const COR = { alto: '#EF4444', moderado: '#F59E0B', baixo: '#4ADE80' };

/** "{Cidade} agora": a visão geral que a zona tinha, agora no nível da cidade (E1-ready). */
export default function CidadeAgora({ resumo, cidadeNome, distribuicao = false, children }: Props) {
  const { alto, moderado, baixo, pior, semDados } = resumo;
  const titulo = semDados
    ? 'Sem dados de risco agora'
    : alto > 0
      ? `${alto} em risco alto${moderado > 0 ? `, ${moderado} em atenção` : ''}`
      : moderado > 0
        ? `${moderado} em atenção`
        : `Tudo tranquilo em ${cidadeNome}`;
  const perigo = pior ? rotuloPerigo(pior) : null;
  const sub = semDados
    ? 'Os dados aparecem assim que a coleta chegar'
    : pior && (alto > 0 || moderado > 0)
      ? `Pior: ${pior.nome}${perigo ? ` · ${perigo}` : ''}`
      : 'Nenhuma subprefeitura em atenção';
  const tom = semDados ? 'sem' : alto > 0 ? 'alto' : moderado > 0 ? 'moderado' : '';
  const total = alto + moderado + baixo;

  return (
    <section className="cid-agora" aria-label={`${cidadeNome} agora`}>
      <div className={`cid-radar ${tom}`} aria-hidden="true"><span /><span /><i /></div>
      <div className="cid-agora-txt">
        <span className="cid-rot">{cidadeNome} agora</span>
        <h2 className="cid-titulo">{titulo}</h2>
        <p className="cid-sub">{sub}</p>
        {distribuicao && total > 0 && (
          <>
            <div className="cid-dist" aria-hidden="true">
              {alto > 0 && <span style={{ flex: alto, background: COR.alto }} />}
              {moderado > 0 && <span style={{ flex: moderado, background: COR.moderado }} />}
              {baixo > 0 && <span style={{ flex: baixo, background: COR.baixo }} />}
            </div>
            <div className="cid-dist-leg">
              <span><i style={{ background: COR.alto }} />{alto} alto</span>
              <span><i style={{ background: COR.moderado }} />{moderado} moderado</span>
              <span><i style={{ background: COR.baixo }} />{baixo} baixo</span>
            </div>
          </>
        )}
      </div>
      {children}
    </section>
  );
}
