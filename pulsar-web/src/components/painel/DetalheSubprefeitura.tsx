import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Bell, BellRing, CloudRain, Droplets, Map as IconeMapa, Phone, Route, Sun, Thermometer, TriangleAlert, Wind, X } from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp';
import { useNotificacoesPrefs } from '../../hooks/useNotificacoesPrefs';
import { usePushSubscription } from '../../hooks/usePushSubscription';
import { usePrevisaoSubprefeitura } from '../../hooks/usePrevisaoSubprefeitura';
import { coresParaFaixa, labelFaixa } from '../../utils/risco';
import { fraseDoRisco } from '../../features/locais/estadoLugar';
import { useCatalogoDicas } from '../../hooks/useCatalogoDicas';
import { blocosDeDicas } from '../../utils/dicas';
import { DURACAO, EASE_SUAVE } from '../../motion/presets';
import { useArrastoFolha } from '../../motion/useArrastoFolha';
import { CIDADE_ATUAL } from '../../features/cidade/cidade';
import { fraseDoTrecho, ondeChoveuMais, type Trecho } from '../../features/cidade/trechos';
import type { Area } from '../../features/cidade/areas';
import type { ChuvaMedida, FaixaRisco, TipoPerigo } from '../../types';
import BotaoCompartilhar from '../../features/compartilhar/BotaoCompartilhar';
import BotaoFavorito from './BotaoFavorito';
import PrevisaoFaixa from './PrevisaoFaixa';
import AlagamentosCge from './AlagamentosCge';
import ChuvaMedidaLinha from './ChuvaMedidaLinha';
import { temChuvaMedida } from '../../utils/chuvaMedida';
import { porExtenso } from '../../utils/texto';
import { deNomeDe } from '../../data/regioes-seo';

const GRAVIDADE: Record<FaixaRisco, number> = { BAIXO: 0, MODERADO: 1, ALTO: 2 };

const decimal = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const inteiro = (v: number) => Math.round(v).toLocaleString('pt-BR');

/** Escala da OMS para o índice UV. */
function nivelUv(uv: number): string {
  if (uv < 3) return 'baixo';
  if (uv < 6) return 'moderado';
  if (uv < 8) return 'alto';
  if (uv < 11) return 'muito alto';
  return 'extremo';
}

/** De onde veio o trecho aberto: a pessoa precisa saber de que pedaço da área é o número. */
export type OrigemTrecho = 'toque' | 'localizacao' | 'busca' | 'ponto';
const ROTULO_TRECHO: Record<OrigemTrecho, string> = {
  toque: 'Trecho que você tocou',
  localizacao: 'Trecho onde você está',
  busca: 'Trecho do endereço buscado',
  ponto: 'Trecho do ponto marcado',
};

const PERIGO: Record<TipoPerigo, { nome: string; Icon: React.ElementType }> = {
  ALAGAMENTO: { nome: 'Alagamento', Icon: CloudRain },
  VENTO: { nome: 'Vento', Icon: Wind },
  CALOR: { nome: 'Calor', Icon: Thermometer },
};

/** Uma coluna do "Tempo agora": nome com ícone, valor com a unidade pequena e um complemento. */
function Coluna({ Icon, nome, valor, unidade, complemento }: {
  Icon: React.ElementType; nome: string; valor: string; unidade?: string; complemento?: string;
}) {
  return (
    <div>
      <em><Icon size={13} aria-hidden="true" />{nome}</em>
      <b>{valor}{unidade && <small>{unidade}</small>}</b>
      <span>{complemento}</span>
    </div>
  );
}

interface Props {
  area: Area;
  isFavorito: (subprefeituraId: string) => boolean;
  onToggleFavorito: (subprefeituraId: string) => void;
  onFechar: () => void;
  /** Abre a rota até aqui; sem ele o botão "Rota até aqui" não aparece. */
  onComoChegar?: () => void;
  /**
   * Folha do celular em duas alturas: curta (só o resumo) e aberta. Sem isto (computador e
   * tablet) o detalhe aparece inteiro e sem alça.
   */
  folha?: { aberta: boolean; onMudar: (aberta: boolean) => void };
  /**
   * Trecho aberto (toque no mapa, busca ou localização): o topo passa a ser dele e a área
   * inteira vira uma linha. O resto (chuva, tempo, emergência) continua sendo da área.
   */
  trecho?: Trecho & { origem: OrigemTrecho };
  /** Estação que mais mediu chuva na área: dá nome ao ponto quando o número veio da medida. */
  estacaoMaisForte?: NonNullable<Trecho['estacao']> | null;
}

/**
 * Detalhe de UMA subprefeitura (desenho de 14/11/2026, entrega 4 do H3). Em cima o resumo:
 * o risco grande com uma frase e o alagamento ativo. O resto vem na ordem do que a pessoa
 * pergunta: o que fazer agora, a chuva (medida, estimada e prevista, cada uma com nome), o
 * tempo agora e os telefones de emergência. As ações ficam presas no pé, sempre no mesmo lugar.
 */
export default function DetalheSubprefeitura({ area, isFavorito, onToggleFavorito, onFechar, onComoChegar, folha, trecho, estacaoMaisForte }: Props) {
  const navigate = useNavigate();
  const { prefs } = useNotificacoesPrefs();
  const push = usePushSubscription(prefs);
  const previsao = usePrevisaoSubprefeitura(area.id);
  const faixas = previsao.erro ? [] : previsao.faixas;
  const s = area.scoreAtual;
  const l = area.ultimaLeitura;
  // O número de cima: o do trecho quando há um aberto, senão o da área.
  const valor = trecho ? trecho.valor : s?.valor;
  const faixa = trecho ? trecho.faixa : area.faixaRisco;
  const cores = coresParaFaixa(faixa);
  const animado = useCountUp(valor ?? 0, 800);
  const catalogo = useCatalogoDicas();
  // As dicas seguem o trecho: o alagamento dele no lugar do da área; vento e calor são da área.
  const scoreDasDicas = trecho && s?.componentes
    ? { ...s, valor: trecho.valor, faixa: trecho.faixa, perigoPrincipal: trecho.perigo, componentes: { ...s.componentes, alagamento: trecho.alagamento } }
    : s;
  const blocos = blocosDeDicas(scoreDasDicas, catalogo);
  // No trecho, "Medida agora" é a estação do trecho (a mesma do topo dele), não a do centro da área.
  const medidaDoTrecho: ChuvaMedida | null = trecho?.estacao ? {
    fonte: trecho.estacao.fonte ?? 'cemaden', mm15: null, mm60: trecho.estacao.mm1h, acumuladoPeriodoMm: null,
    posto: trecho.estacao.nome || trecho.estacao.cod, vizinho: false,
    distanciaKm: trecho.estacao.distanciaKm, coletadoEm: trecho.estacao.em ?? '',
  } : null;
  const medidaDoCartao = trecho ? medidaDoTrecho : area.chuvaMedida;
  const medida = temChuvaMedida(medidaDoCartao);
  // O número da área veio da chuva medida (num ponto dela): o cartão abre com essa leitura.
  const pelaMedida = !trecho && (s?.chuva3hMedidaMm ?? 0) > 0;
  // Em Tranquilo a chuva medida não gerou risco nenhum: uma faixa só, sem "gerou o risco" nem
  // "chuva forte", e o modelo no bloco dele, como nas áreas sem medida (opção B, crítica 8).
  const calma = pelaMedida && area.faixaRisco === 'BAIXO';
  const modeloEmLinha = (pelaMedida && !calma) || !!trecho?.estacao;
  const choveuMedido = pelaMedida || (trecho?.estacao?.mm3h ?? 0) > 0;
  const pontos = area.alagamentosCge ?? [];
  const riscoVento = s?.componentes?.vento.faixa;
  const alca = useRef<HTMLButtonElement>(null);
  const aberta = folha?.aberta ?? true;
  useArrastoFolha(alca, { aberta, onMudar: folha?.onMudar, onFechar });
  // Quem escolheu a área por um botão que sumiu (linha da busca, da lista) ficava com o foco no
  // nada: o título recebe o foco e o leitor de tela anuncia onde a pessoa chegou (crítica 8).
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (document.activeElement === document.body) titulo.current?.focus({ preventScroll: true });
  }, [area.id]);
  // Escape fecha o detalhe com o foco nele. A folha da chuva é portal: o evento dela passa pela
  // árvore do React, mas não pelo DOM daqui, e ela cuida do próprio Escape.
  function teclar(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Escape' || e.defaultPrevented || !e.currentTarget.contains(e.target as Node)) return;
    e.preventDefault();
    onFechar();
    document.getElementById('busca-mapa')?.focus();
  }

  return (
    <motion.div
      className="det painel-glass flex flex-col h-full overflow-hidden"
      data-estado={aberta ? 'aberta' : 'curta'}
      onKeyDown={teclar}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DURACAO.media, ease: EASE_SUAVE }}
    >
      {folha && (
        <button ref={alca} type="button" className="det-alca" aria-expanded={aberta}
          aria-label={aberta ? 'Mostrar menos' : 'Mostrar mais detalhes'} onClick={() => folha.onMudar(!aberta)}>
          <span aria-hidden="true" />
        </button>
      )}

      <div className="det-cab">
        <div className="flex-1 min-w-0">
          <h2 ref={titulo} tabIndex={-1} className="truncate outline-none">{area.nome}</h2>
          <p className="truncate">{trecho ? `${ROTULO_TRECHO[trecho.origem]} · Zona ${area.zona}` : `Zona ${area.zona} · ${CIDADE_ATUAL.nome}`}</p>
        </div>
        <BotaoFavorito ativo={isFavorito(area.id)} onToggle={() => onToggleFavorito(area.id)} size={20} />
        <button type="button" className="det-fechar" onClick={onFechar} aria-label="Fechar"><X size={20} aria-hidden="true" /></button>
      </div>

      <div className="det-rola painel-scroll" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {/* Resumo: o que aparece ao tocar. A cor só aqui. */}
        <div className="det-hero" style={{ '--c': cores.fill, '--c-escura': cores.text } as React.CSSProperties}>
          <span className="det-hero-num score-ring-valor" aria-label={`Score ${Math.round(valor ?? 0)} de 100`}>
            {valor != null ? Math.round(animado) : '–'}
          </span>
          <div className="min-w-0">
            <p className="det-hero-faixa score-ring-valor">{labelFaixa(faixa)}</p>
            <p className="det-hero-frase">{trecho ? fraseDoTrecho(trecho, area, faixas) : fraseDoRisco(area, faixas)}</p>
          </div>
        </div>
        {/* Com o detalhe inteiro na tela, o cartão do CGE vem logo abaixo: a linha só resume a folha curta. */}
        {pontos.length > 0 && folha && !folha.aberta && (
          <p className="det-linha">
            <TriangleAlert size={17} aria-hidden="true" className="text-risco-alto-text" />
            <span>{pontos.length === 1 ? `Alagamento agora: ${porExtenso(pontos[0].via)}` : `${pontos.length} pontos de alagamento agora`}</span>
          </p>
        )}
        {trecho && (
          <p className="det-linha">
            <IconeMapa size={17} aria-hidden="true" style={{ color: coresParaFaixa(area.faixaRisco).fill }} />
            <span>
              {`${area.nome} inteira em ${labelFaixa(area.faixaRisco)}`}
              {/* Trecho mais calmo que a área: diz por quê, para os dois números não brigarem. */}
              {GRAVIDADE[trecho.faixa] < GRAVIDADE[area.faixaRisco ?? 'BAIXO'] && (
                <small className="det-linha-ponte">
                  {(s?.chuva3hMedidaMm ?? 0) > 0
                    ? estacaoMaisForte && estacaoMaisForte.mm3h > 0
                      ? `A chuva forte foi ${ondeChoveuMais(estacaoMaisForte)}: ${decimal(estacaoMaisForte.mm3h)} mm em 3 h.`
                      : `A chuva forte foi em outro ponto ${deNomeDe(area.nome)}.`
                    : `O risco maior está em outro ponto ${deNomeDe(area.nome)}.`}
                </small>
              )}
            </span>
          </p>
        )}

        <div className="det-resto">
          {/* Dado oficial antes de tudo que é estimativa. */}
          <AlagamentosCge pontos={area.alagamentosCge} />

          {blocos.length > 0 && (
            <section className="det-sec">
              <h3 className="det-t">O que fazer agora</h3>
              {blocos.map(({ perigo, faixa, dicas }) => {
                const { nome, Icon } = PERIGO[perigo];
                return (
                  <div key={perigo} className="mb-3" style={{ '--c': coresParaFaixa(faixa).fill } as React.CSSProperties}>
                    <h4 className="det-perigo-t flex items-center gap-1.5 mb-1.5 mx-1" style={{ fontSize: 12.5, fontWeight: 600, '--c-escura': coresParaFaixa(faixa).text } as React.CSSProperties}>
                      <Icon size={14} aria-hidden="true" />{`${nome} · ${labelFaixa(faixa)}`}
                    </h4>
                    {dicas.map((d) => (
                      <div key={d.id} className="sugestao-card">
                        <p className="font-semibold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{d.titulo}</p>
                        <p style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--text-secondary)' }}>{d.descricao}</p>
                      </div>
                    ))}
                  </div>
                );
              })}
            </section>
          )}

          {(s || medida || faixas.length > 0) && (
            <section className="det-sec">
              <h3 className="det-t">Chuva</h3>
              <div className="det-bloco">
                {/* O número veio da chuva medida: a leitura que o fez vem primeiro (crítica de 15/11). */}
                {pelaMedida && !calma && s?.chuva3hMedidaMm != null && (
                  <div className="det-faixa">
                    <div className="det-faixa-cab"><span className="det-faixa-nome">Chuva que gerou o risco</span></div>
                    <div className="det-par um">
                      <div><b>{decimal(s.chuva3hMedidaMm)}<span>mm</span></b><i>{estacaoMaisForte ? `em 3 h, mais forte ${ondeChoveuMais(estacaoMaisForte)}`
                        : `em 3 h, num ponto ${deNomeDe(area.nome)}`}</i></div>
                    </div>
                  </div>
                )}
                <ChuvaMedidaLinha nome={area.nome} medida={medidaDoCartao} chuva24h={trecho ? null : area.chuva24h}
                  numeroPelaMedida={pelaMedida} doTrecho={!!trecho} mm3h={trecho?.estacao?.mm3h}
                  calmaMm3h={calma ? s?.chuva3hMedidaMm ?? undefined : undefined} />
                {/* Modelo em uma linha quando é a medida que manda (área pela medida, ou trecho com estação):
                    no trecho ele é da região inteira e não pode parecer o número do trecho (crítica de 15/11). */}
                {s && modeloEmLinha && (
                  <div className="det-faixa">
                    <p className="det-faixa-modelo">{choveuMedido && (s.chuva3hMm ?? 0) < 1
                      // "0 mm" ao lado de uma medida de chuva parece erro: diz que o modelo não viu.
                      ? `O modelo não registrou essa chuva${trecho ? ` na região ${deNomeDe(area.nome)}` : ""}.`
                      : `O modelo estimou ${decimal(s.chuva3hMm ?? 0)} mm em 3 h${trecho ? ` para toda a região ${deNomeDe(area.nome)}` : ""}.`}</p>
                  </div>
                )}
                {s && !modeloEmLinha && (
                  <div className="det-faixa">
                    <div className="det-faixa-cab"><span className="det-faixa-nome">Estimada pelo modelo</span></div>
                    <div className={medida ? 'det-par menor' : 'det-par'}>
                      <div><b>{decimal(s.chuva3hMm ?? 0)}<span>mm</span></b><i>nas últimas 3 horas</i></div>
                      <div><b>{decimal(s.chuva48hMm ?? 0)}<span>mm</span></b><i>nas últimas 48 horas</i></div>
                    </div>
                    {!medida && <p className="det-aviso">Não há estação com leitura perto daqui agora. O risco usa a chuva estimada.</p>}
                  </div>
                )}
                <PrevisaoFaixa faixas={faixas} erro={null} />
              </div>
            </section>
          )}

          {l && (
            <section className="det-sec">
              <h3 className="det-t">Tempo agora</h3>
              <div className="det-bloco det-quad">
                <Coluna Icon={Wind} nome="Vento" valor={inteiro(l.ventoKmH)} unidade="km/h"
                  complemento={riscoVento && riscoVento !== 'BAIXO' ? labelFaixa(riscoVento) : undefined} />
                <Coluna Icon={Thermometer} nome="Temp." valor={inteiro(l.temperaturaC)} unidade="°C"
                  complemento={`sensação ${inteiro(l.sensacaoTermica)}°`} />
                <Coluna Icon={Droplets} nome="Umidade" valor={inteiro(l.umidade)} unidade="%"
                  complemento={`visib. ${inteiro(l.visibilidadeKm)} km`} />
                <Coluna Icon={Sun} nome="UV" valor={inteiro(l.indiceUv)} complemento={nivelUv(l.indiceUv)} />
              </div>
            </section>
          )}

          <div className="det-fim">
            <p className="det-fim-t">Em emergência, ligue</p>
            <div className="det-tel">
              <a href="tel:199"><Phone size={15} aria-hidden="true" /><strong>199</strong>Defesa Civil</a>
              <a href="tel:193"><Phone size={15} aria-hidden="true" /><strong>193</strong>Bombeiros</a>
            </div>
            <p className="det-fim-nota">O risco é uma estimativa do Pulsar e não substitui os avisos oficiais.</p>
          </div>
        </div>
      </div>

      <div className="det-pe">
        {onComoChegar && (
          <button type="button" className="det-acao forte" onClick={onComoChegar}><Route size={15} aria-hidden="true" />Rota até aqui</button>
        )}
        {push.estado === 'ativo' ? (
          <span className="det-acao ligado"><BellRing size={15} aria-hidden="true" /><span><span className="sr-only">Avisos </span>Ligados</span></span>
        ) : (
          <button type="button" className="det-acao" onClick={() => navigate('/app/boas-vindas')}><Bell size={15} aria-hidden="true" />Avisar</button>
        )}
        <BotaoCompartilhar area={area} rotulo="Enviar" />
      </div>
    </motion.div>
  );
}
