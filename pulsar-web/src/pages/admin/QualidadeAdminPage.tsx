import { Fragment, useState } from 'react';
import { ChevronDown, CircleCheck, Gauge, TriangleAlert } from 'lucide-react';
import Header from '../../components/ui/Header';
import GlassCard from '../../components/ui/GlassCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import AdminSubnav from '../../components/admin/AdminSubnav';
import { useQualidadeAdmin } from '../../hooks/useQualidadeAdmin';
import { tempoRelativo } from '../../utils/data';
import type { QualidadeDiaDto, SincronizacaoFonteDto, TipoAvisoQualidade } from '../../types';

const PERIODOS = [7, 30] as const;

const TITULO_AVISO: Record<TipoAvisoQualidade, string> = {
  'chuva-nao-aconteceu': 'Chuva que não aconteceu',
  'chuva-passou-batida': 'Chuva que passou batida',
  'alerta-sem-confirmacao': 'Alerta sem confirmação',
  'coleta-falhando': 'Coleta falhando',
  'geosampa-parado': 'GeoSampa parado',
};

/** "2026-10-26" → "26/10". Sem Date: o dia já é local, e o parse em UTC voltaria um dia. */
const diaCurto = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;

const mm = (v: number | null) =>
  v === null ? 's/d' : v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const horas = (v: number | null) => (v === null ? 's/d' : String(v));

type Linha = Omit<QualidadeDiaDto, 'dia' | 'teveAlerta'>;

export default function QualidadeAdminPage() {
  const [dias, setDias] = useState<number>(7);
  const [aberta, setAberta] = useState<string | null>(null);
  const { dados, carregando, erro, recarregar } = useQualidadeAdmin(dias);
  const comAviso = new Set(dados?.avisos.map((a) => a.subprefeitura));

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100dvh' }}>
      <Header />
      <main className="mx-auto w-full px-4" style={{ maxWidth: 900, paddingTop: 80, paddingBottom: 80 }}>
        <AdminSubnav />

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Gauge size={22} style={{ color: 'var(--text-accent)' }} />
            <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 22, color: 'var(--text-primary)' }}>
              Qualidade dos dados
            </h1>
          </div>
          <div className="flex items-center gap-1.5" role="group" aria-label="Período">
            {PERIODOS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setDias(p)}
                aria-pressed={dias === p}
                className="rounded-full px-3.5 py-1.5"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  border: '1px solid var(--border-glass)',
                  background: dias === p ? 'var(--bg-glass-hover)' : 'transparent',
                  color: dias === p ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                {p} dias
              </button>
            ))}
          </div>
        </div>

        {carregando ? (
          <div className="py-20 grid place-items-center"><LoadingSpinner /></div>
        ) : erro || !dados ? (
          <ErrorBanner mensagem="Não foi possível carregar o painel de qualidade." onRetry={recarregar} />
        ) : (
          <>
            <GlassCard hover={false} padding="lg" className="mb-5">
              <h2 className="mb-3" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, color: 'var(--text-secondary)' }}>
                Problemas
              </h2>
              {dados.avisos.length === 0 ? (
                <p className="inline-flex items-center gap-2 rounded-[10px] px-3.5 py-2 bg-risco-baixo-bg text-risco-baixo-text font-semibold" style={{ fontSize: 13.5 }}>
                  <CircleCheck size={16} aria-hidden="true" />
                  Nenhum problema nos últimos {dados.dias} dias.
                </p>
              ) : (
                <ul className="space-y-2">
                  {dados.avisos.map((a) => (
                    <li
                      key={`${a.tipo}-${a.subprefeitura}-${a.dia}`}
                      className="rounded-[10px] px-3.5 py-2.5 bg-risco-alto-bg text-risco-alto-text"
                    >
                      <p className="flex items-center gap-1.5 font-semibold" style={{ fontSize: 13.5 }}>
                        <TriangleAlert size={15} aria-hidden="true" />
                        {TITULO_AVISO[a.tipo]}{a.subprefeitura && `: ${a.subprefeitura}, ${diaCurto(a.dia)}`}
                      </p>
                      <p style={{ fontSize: 12.5, marginTop: 2 }}>{a.detalhe}</p>
                    </li>
                  ))}
                </ul>
              )}
              <LinhaGeoSampa geo={dados.geoSampa} />
              {!dados.openMeteoDisponivel && (
                <p className="mt-3" style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  O Open-Meteo não respondeu agora. Os avisos que comparam a chuva ficaram de fora.
                </p>
              )}
            </GlassCard>

            <GlassCard hover={false} padding="lg">
              <h2 className="mb-1" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, color: 'var(--text-secondary)' }}>
                Por subprefeitura
              </h2>
              <p className="mb-3" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Chuva em mm no período. Toque numa linha para ver os dias.
              </p>
              <div className="overflow-x-auto -mx-1">
                <table className="w-full" style={{ fontSize: 12.5, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', fontSize: 11.5, textAlign: 'right' }}>
                      <th className="px-1 py-1.5 font-semibold" style={{ textAlign: 'left' }}>Subprefeitura</th>
                      <th className="px-1 py-1.5 font-semibold">Pulsar</th>
                      <th className="px-1 py-1.5 font-semibold">Open&shy;-Meteo</th>
                      <th className="px-1 py-1.5 font-semibold" title="Horas em que a proteção barrou a chuva do OWM">Barradas</th>
                      <th className="px-1 py-1.5 font-semibold" title="Horas sem as 4 leituras do ciclo">Sem coleta</th>
                      <th className="px-1 py-1.5 font-semibold" title="Pontos de alagamento do CGE">CGE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.subprefeituras.map((s) => {
                      const expandida = aberta === s.id;
                      return (
                        <Fragment key={s.id}>
                          <tr className="border-t" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                            <td className="px-1 py-1.5">
                              <button
                                type="button"
                                onClick={() => setAberta(expandida ? null : s.id)}
                                aria-expanded={expandida}
                                className="flex items-center gap-1 text-left"
                                style={{ color: 'var(--text-primary)', fontWeight: 600 }}
                              >
                                <ChevronDown
                                  size={14}
                                  aria-hidden="true"
                                  style={{ transform: expandida ? 'none' : 'rotate(-90deg)', transition: 'transform 150ms', color: 'var(--text-muted)' }}
                                />
                                {s.nome}
                                {comAviso.has(s.nome) && (
                                  <span className="inline-grid place-items-center rounded-full bg-risco-alto-bg text-risco-alto-text" style={{ width: 18, height: 18 }}>
                                    <TriangleAlert size={11} aria-label="tem aviso" />
                                  </span>
                                )}
                              </button>
                            </td>
                            <Celulas linha={s} />
                          </tr>
                          {expandida && s.dias.map((d) => (
                            <tr key={d.dia} style={{ color: 'var(--text-secondary)', fontSize: 12.5 }}>
                              <td className="py-1" style={{ paddingLeft: 24 }}>
                                {diaCurto(d.dia)}
                                {d.teveAlerta && <span className="ml-1.5 rounded-full px-1.5 font-semibold bg-risco-alto-bg text-risco-alto-text" style={{ fontSize: 10.5 }}>Alerta</span>}
                              </td>
                              <Celulas linha={d} />
                            </tr>
                          ))}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-3" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                s/d: sem dado. As horas barradas e sem coleta existem a partir de 26/10/2026.
              </p>
            </GlassCard>
          </>
        )}
      </main>
    </div>
  );
}

/** Estado do sync das ocorrências históricas. Some a dúvida "não publicaram ou o job parou?". */
function LinhaGeoSampa({ geo }: { geo: SincronizacaoFonteDto }) {
  const partes = !geo.ultimaTentativa
    ? ['Nenhuma sincronização registrada ainda.']
    : [
        geo.ultimoSucesso
          ? `Último sucesso ${tempoRelativo(geo.ultimoSucesso)}, com ${geo.novasNoUltimoSucesso} ${geo.novasNoUltimoSucesso === 1 ? 'ocorrência nova' : 'ocorrências novas'}.`
          : 'Nenhum sucesso registrado.',
        geo.ultimaTentativaSucesso === false ? `A última tentativa, ${tempoRelativo(geo.ultimaTentativa)}, falhou.` : '',
      ];
  return (
    <p className="mt-3" style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
      <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>GeoSampa: </span>
      {partes.filter(Boolean).join(' ')}
    </p>
  );
}

function Celulas({ linha }: { linha: Linha }) {
  return (
    <>
      <td className="px-1 py-1.5 text-right tabular-nums">{mm(linha.chuvaPulsarMm)}</td>
      <td className="px-1 py-1.5 text-right tabular-nums">{mm(linha.chuvaOpenMeteoMm)}</td>
      <td className="px-1 py-1.5 text-right tabular-nums">{horas(linha.horasBarradas)}</td>
      <td className="px-1 py-1.5 text-right tabular-nums">{horas(linha.horasIncompletas)}</td>
      <td className="px-1 py-1.5 text-right tabular-nums">{linha.pontosCge}</td>
    </>
  );
}
