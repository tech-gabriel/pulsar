import { useState } from 'react';
import { BriefcaseBusiness, House, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useLocaisSalvos } from '../../hooks/useLocaisSalvos';
import { useBuscaEndereco } from '../../hooks/useBuscaEndereco';
import { useSubprefeituras } from '../../hooks/useSubprefeituras';
import { useJsonPublico } from '../../hooks/useJsonPublico';
import { ROTULO_TIPO, subprefeituraIdDoPonto } from '../../features/locais/regras';
import type { PontoRota } from '../../features/rota/tipos';
import type { TipoLocal } from '../../types';
import type { FeatureCollection } from 'geojson';

const TIPOS: { tipo: TipoLocal; Icone: typeof House }[] = [
  { tipo: 'CASA', Icone: House },
  { tipo: 'TRABALHO', Icone: BriefcaseBusiness },
];

const botao = 'min-h-11 px-3 inline-flex items-center';

/** Busca só de endereços; escolher um devolve o ponto. */
function BuscaInline({ tipo, onEscolher, onCancelar }: { tipo: TipoLocal; onEscolher: (p: PontoRota) => void; onCancelar: () => void }) {
  const { setTermo, resultados, carregando } = useBuscaEndereco();
  return (
    <div className="mt-2">
      <div className="flex items-center gap-1">
        <input
          type="text"
          aria-label={`Endereço de ${ROTULO_TIPO[tipo].toLowerCase()}`}
          placeholder={`Busque o endereço ${tipo === 'CASA' ? 'da sua casa' : 'do seu trabalho'}`}
          autoFocus
          onChange={(e) => setTermo(e.target.value)}
          className="input-glass flex-1 min-w-0"
        />
        {carregando && <Loader2 size={15} className="animate-spin" style={{ color: 'var(--text-muted)' }} aria-hidden="true" />}
        <button type="button" onClick={onCancelar} className={botao} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Cancelar</button>
      </div>
      {resultados.length > 0 && (
        <ul aria-label="Endereços" className="mt-1.5 max-h-60 overflow-y-auto rounded-xl" style={{ background: 'var(--bg-input)' }}>
          {resultados.map((r, i) => (
            <li key={`${r.descricao}-${i}`}>
              <button
                type="button"
                onClick={() => onEscolher({ lat: r.latitude, lon: r.longitude, rotulo: r.nome || r.descricao, fonte: 'endereco' })}
                className="w-full text-left px-3 py-2.5 min-h-11 truncate"
                style={{ fontSize: 13, color: 'var(--text-primary)' }}
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

/** Casa e trabalho da conta, com troca e exclusão. O título fica por conta da página. */
export default function CasaTrabalhoCard() {
  const { usuario } = useAuth();
  const { showToast } = useToast();
  const { locais, carregando, salvar, apagar } = useLocaisSalvos(usuario?.id ?? null);
  const { subprefeituras } = useSubprefeituras();
  const contorno = useJsonPublico<FeatureCollection>('/subprefeituras-leve.geojson', true);
  const [editando, setEditando] = useState<TipoLocal | null>(null);
  const [apagando, setApagando] = useState<TipoLocal | null>(null);

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
    if (await salvar(tipo, p, id, 'configuracoes')) setEditando(null);
  }

  async function confirmarApagar(tipo: TipoLocal) {
    await apagar(tipo);
    setApagando(null);
  }

  return (
    <>
      <p className="mb-2" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
        Aparecem primeiro quando você abre a Rota. Ficam guardados na sua conta e só você vê.
      </p>
      <div className="flex flex-col gap-2">
        {TIPOS.map(({ tipo, Icone }) => {
          const local = locais[tipo];
          return (
            <div key={tipo} className="regiao-card" style={{ marginBottom: 0 }}>
              <div className="flex items-center gap-3">
                <Icone size={16} style={{ color: 'var(--text-accent)' }} aria-hidden="true" />
                <span className="flex-1 min-w-0">
                  <span className="block" style={{ fontSize: 14, color: 'var(--text-primary)' }}>{ROTULO_TIPO[tipo]}</span>
                  <span className="block truncate" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {carregando ? 'Carregando…' : local ? local.rotulo : 'Não salvo'}
                  </span>
                </span>
                {!carregando && editando !== tipo && (apagando === tipo ? (
                  <>
                    <button type="button" onClick={() => void confirmarApagar(tipo)} className={botao} style={{ fontSize: 13, fontWeight: 600, color: '#EF4444' }}>Apagar</button>
                    <button type="button" onClick={() => setApagando(null)} className={botao} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Cancelar</button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => { setEditando(tipo); setApagando(null); }} className={botao} style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-accent)' }}>
                      {local ? 'Trocar' : 'Salvar'}
                    </button>
                    {local && (
                      <button type="button" onClick={() => setApagando(tipo)} className={botao} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Apagar</button>
                    )}
                  </>
                ))}
              </div>
              {editando === tipo && <BuscaInline tipo={tipo} onEscolher={(p) => void escolher(tipo, p)} onCancelar={() => setEditando(null)} />}
            </div>
          );
        })}
      </div>
    </>
  );
}
