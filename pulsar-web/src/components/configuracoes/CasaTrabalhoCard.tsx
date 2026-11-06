import { useEffect, useRef, useState } from 'react';
import { BriefcaseBusiness, House, Loader2 } from 'lucide-react';
import { LinhaAjuste, Seta } from './GrupoAjustes';
import FolhaInferior from '../ui/FolhaInferior';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useLocaisSalvos } from '../../hooks/useLocaisSalvos';
import { useBuscaEndereco } from '../../hooks/useBuscaEndereco';
import { useSubprefeituras } from '../../hooks/useSubprefeituras';
import { useJsonPublico } from '../../hooks/useJsonPublico';
import { useFavoritos } from '../../hooks/useFavoritos';
import { ROTULO_TIPO, subprefeituraIdDoPonto } from '../../features/locais/regras';
import type { PontoRota } from '../../features/rota/tipos';
import type { LocalSalvoDto, TipoLocal } from '../../types';
import type { FeatureCollection } from 'geojson';

const TIPOS: { tipo: TipoLocal; Icone: typeof House }[] = [
  { tipo: 'CASA', Icone: House },
  { tipo: 'TRABALHO', Icone: BriefcaseBusiness },
];

const DA = { CASA: 'da sua casa', TRABALHO: 'do seu trabalho' } as const;
const O = { CASA: 'a casa', TRABALHO: 'o trabalho' } as const;

type Folha =
  | { tipo: TipoLocal; etapa: 'lugar' | 'apagar'; local: LocalSalvoDto }
  | { tipo: TipoLocal; etapa: 'trocar'; local: LocalSalvoDto; ponto: PontoRota; id: string };

/** Busca só de endereços; escolher um devolve o ponto. */
function BuscaInline({ tipo, onEscolher, onCancelar }: { tipo: TipoLocal; onEscolher: (p: PontoRota) => void; onCancelar: () => void }) {
  const { setTermo, resultados, carregando } = useBuscaEndereco();
  const campo = useRef<HTMLInputElement>(null);
  // Effect e não autoFocus: a folha que acabou de fechar devolve o foco a quem a abriu no mesmo commit.
  useEffect(() => { campo.current?.focus(); }, []);
  return (
    <div className="px-3.5 pb-3">
      <div className="flex items-center gap-1">
        <input
          ref={campo}
          type="text"
          aria-label={`Endereço de ${ROTULO_TIPO[tipo].toLowerCase()}`}
          placeholder={`Busque o endereço ${DA[tipo]}`}
          onChange={(e) => setTermo(e.target.value)}
          className="input-glass flex-1 min-w-0"
        />
        {carregando && <Loader2 size={15} className="animate-spin" style={{ color: 'var(--text-muted)' }} aria-hidden="true" />}
        <button type="button" onClick={onCancelar} className="min-h-11 px-3" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Cancelar</button>
      </div>
      {resultados.length > 0 && (
        <ul aria-label="Endereços" className="mt-1.5 max-h-60 overflow-y-auto rounded-xl" style={{ background: 'var(--bg-input)' }}>
          {resultados.map((r, i) => (
            <li key={`${r.descricao}-${i}`}>
              <button
                type="button"
                onClick={() => onEscolher({ lat: r.latitude, lon: r.longitude, rotulo: r.nome || r.descricao, fonte: 'endereco' })}
                className="w-full text-left px-3 py-2.5 min-h-11 truncate"
                style={{ fontSize: 14, color: 'var(--text-primary)' }}
              >
                {r.nome || r.descricao}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const tituloFolha = { fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' } as const;
const textoFolha = { fontSize: 14, lineHeight: 1.5, color: 'var(--text-secondary)' } as const;
const botaoFolha = 'w-full min-h-[50px] rounded-[14px] inline-flex items-center justify-center disabled:opacity-60';

/**
 * Linhas Casa e Trabalho do grupo "Seus lugares". Vazio: "Salvar" abre a busca. Salvo: a linha abre
 * uma folha com Trocar e Apagar, e cada uma pede confirmação antes de mexer no endereço.
 */
export default function CasaTrabalhoCard() {
  const { usuario } = useAuth();
  const { showToast } = useToast();
  const { locais, carregando, salvar, apagar } = useLocaisSalvos(usuario?.id ?? null);
  const { favoritos } = useFavoritos();
  const { subprefeituras } = useSubprefeituras();
  const contorno = useJsonPublico<FeatureCollection>('/subprefeituras-leve.geojson', true);
  const [editando, setEditando] = useState<TipoLocal | null>(null);
  const [folha, setFolha] = useState<Folha | null>(null);
  // A folha guarda o último conteúdo enquanto desliza para fora.
  const [ultima, setUltima] = useState<Folha | null>(null);
  if (folha && folha !== ultima) setUltima(folha);
  const [ocupado, setOcupado] = useState(false);
  // Trocou de etapa com a folha aberta: o foco vai para o Cancelar novo. Effect e não autoFocus, para a
  // folha guardar antes quem a abriu (o effect dela, filho, roda primeiro) e devolver o foco a ele no fim.
  const botaoCancelar = useRef<HTMLButtonElement>(null);
  const etapa = folha?.etapa;
  useEffect(() => { if (etapa) botaoCancelar.current?.focus(); }, [etapa]);
  // Trocou ou apagou: quem abriu a folha pode ter sumido (o resultado da busca), então o foco vai para a
  // linha daquele lugar. Roda depois do effect da folha, que tenta devolver o foco a quem a abriu.
  const focarLinha = useRef<TipoLocal | null>(null);
  useEffect(() => {
    if (!focarLinha.current || folha) return;
    document.querySelector<HTMLElement>(`[data-local="${focarLinha.current}"] .linha-ajuste`)?.focus();
    focarLinha.current = null;
  }, [folha]);

  async function escolher(tipo: TipoLocal, p: PontoRota) {
    if (!contorno.dados || subprefeituras.length === 0) {
      showToast('Ainda carregando o mapa das regiões. Tente de novo em instantes.', 'info');
      return;
    }
    const id = subprefeituraIdDoPonto(p, contorno.dados, subprefeituras);
    if (!id) {
      showToast('Esse endereço fica fora da cidade de São Paulo.', 'error');
      return;
    }
    const atual = locais[tipo];
    if (atual) return setFolha({ tipo, etapa: 'trocar', local: atual, ponto: p, id });
    if (await salvar(tipo, p, id, 'configuracoes')) setEditando(null);
  }

  async function confirmar() {
    if (!folha) return;
    setOcupado(true);
    const ok = folha.etapa === 'trocar'
      ? await salvar(folha.tipo, folha.ponto, folha.id, 'configuracoes')
      : await apagar(folha.tipo);
    setOcupado(false);
    if (ok) { focarLinha.current = folha.tipo; setFolha(null); setEditando(null); }
  }

  const f = folha ?? ultima;
  // O endereço fica guardado na folha: ao sair depois de Apagar ou Trocar, ela não esvazia nem mostra o novo.
  const local = f?.local;
  const favorita = !!local && favoritos.some((x) => x.subprefeituraId === local.subprefeituraId);
  const cancelar = (
    <button type="button" ref={botaoCancelar} data-foco-inicial onClick={() => setFolha(null)} disabled={ocupado}
      className={`${botaoFolha} mt-1.5`} style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 15 }}>
      Cancelar
    </button>
  );

  return (
    <>
      {TIPOS.map(({ tipo, Icone }) => {
        const salvo = locais[tipo];
        const titulo = ROTULO_TIPO[tipo];
        if (carregando) return <LinhaAjuste key={tipo} Icone={Icone} titulo={titulo} subtitulo="Carregando…" />;
        return (
          <div key={tipo} data-local={tipo}>
            {salvo ? (
              <LinhaAjuste Icone={Icone} titulo={titulo} subtitulo={salvo.rotulo} direita={<Seta />}
                onClick={() => { setEditando(null); setFolha({ tipo, etapa: 'lugar', local: salvo }); }} />
            ) : (
              <LinhaAjuste Icone={Icone} titulo={titulo} onClick={() => setEditando(tipo)} ariaLabel={`Salvar ${titulo.toLowerCase()}`}
                direita={<span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-accent)' }}>Salvar</span>} />
            )}
            {editando === tipo && <BuscaInline tipo={tipo} onEscolher={(p) => void escolher(tipo, p)} onCancelar={() => setEditando(null)} />}
          </div>
        );
      })}

      <FolhaInferior aberta={!!folha} onFechar={() => { if (!ocupado) setFolha(null); }} tituloId="titulo-folha-lugar">
        {f && local && (
          <div key={f.etapa} className="text-center">
            {f.etapa === 'lugar' && (
              <>
                <h2 id="titulo-folha-lugar" style={tituloFolha}>{ROTULO_TIPO[f.tipo]}</h2>
                <p className="mt-1.5 mb-5" style={textoFolha}>{local.rotulo}</p>
                <button type="button" onClick={() => { setFolha(null); setEditando(f.tipo); }}
                  className={botaoFolha} style={{ background: 'var(--bg-input)', color: 'var(--text-accent)', fontWeight: 600, fontSize: 15 }}>
                  Trocar endereço
                </button>
                <button type="button" onClick={() => setFolha({ tipo: f.tipo, etapa: 'apagar', local: f.local })}
                  className={`${botaoFolha} botao-destrutivo mt-2`} style={{ fontWeight: 600, fontSize: 15 }}>
                  Apagar
                </button>
              </>
            )}
            {f.etapa === 'apagar' && (
              <>
                <h2 id="titulo-folha-lugar" style={tituloFolha}>Apagar o endereço {DA[f.tipo]}?</h2>
                <p className="mt-1.5 mb-5" style={textoFolha}>
                  {local.rotulo} sai da sua conta.{favorita && ` ${local.subprefeituraNome} continua nas suas favoritas.`}
                </p>
                <button type="button" onClick={() => void confirmar()} disabled={ocupado}
                  className={`${botaoFolha} botao-destrutivo gap-2`} style={{ fontWeight: 700, fontSize: 15 }}>
                  {ocupado && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                  Apagar {f.tipo === 'CASA' ? 'casa' : 'trabalho'}
                </button>
              </>
            )}
            {f.etapa === 'trocar' && (
              <>
                <h2 id="titulo-folha-lugar" style={tituloFolha}>Trocar {O[f.tipo]} para {f.ponto.rotulo}?</h2>
                <p className="mt-1.5 mb-5" style={textoFolha}>O endereço atual, {local.rotulo}, deixa de ser usado na Rota.</p>
                <button type="button" onClick={() => void confirmar()} disabled={ocupado}
                  className={`${botaoFolha} btn-gradient gap-2`} style={{ fontWeight: 700, fontSize: 15 }}>
                  {ocupado && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                  Trocar
                </button>
              </>
            )}
            {cancelar}
          </div>
        )}
      </FolhaInferior>
    </>
  );
}
