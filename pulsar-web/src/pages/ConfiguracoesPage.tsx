import { useState } from 'react';
import { Layers, Loader2, Moon, Star, Sun } from 'lucide-react';
import FolhaInferior from '../components/ui/FolhaInferior';
import Header from '../components/ui/Header';
import SobreCard from '../components/ui/SobreCard';
import CartaoConfirmarEmail from '../components/auth/CartaoConfirmarEmail';
import CasaTrabalhoCard from '../components/configuracoes/CasaTrabalhoCard';
import ContaGrupo from '../components/configuracoes/ContaGrupo';
import AvisosGrupo from '../components/configuracoes/AvisosGrupo';
import { GrupoAjustes, Interruptor, LinhaAjuste, Seta } from '../components/configuracoes/GrupoAjustes';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { useTransparencia } from '../hooks/useTransparencia';
import { useToast } from '../contexts/ToastContext';
import { useFavoritos } from '../hooks/useFavoritos';
import { useLocaisSalvos } from '../hooks/useLocaisSalvos';

/** "Itaquera, Mooca, Vila Mariana e mais 2". */
function resumoNomes(nomes: string[]): string {
  if (nomes.length === 0) return 'Nenhuma ainda';
  if (nomes.length <= 3) return nomes.length === 1 ? nomes[0] : `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
  return `${nomes.slice(0, 3).join(', ')} e mais ${nomes.length - 3}`;
}

/** Configurações no estilo Ajustes do iPhone: grupos sólidos, uma ideia por linha. */
export default function ConfiguracoesPage() {
  const { usuario, logout, sairDeTodosOsAparelhos } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const { favoritos } = useFavoritos();
  // ponytail: o CasaTrabalhoCard faz o próprio GET; a linha de chuva em casa só aparece depois de
  // recarregar quando a pessoa salva o primeiro lugar ali. Subir o estado para cá se incomodar.
  const { locais } = useLocaisSalvos(usuario?.id ?? null);
  const vidro = useTransparencia();
  const dark = theme === 'dark';

  const [folhaSairTodos, setFolhaSairTodos] = useState(false);
  const [saindoTodos, setSaindoTodos] = useState(false);

  async function confirmarSairDeTodos() {
    setSaindoTodos(true);
    try {
      await sairDeTodosOsAparelhos(); // sucesso recarrega a página no login
    } catch {
      showToast('Não foi possível sair de todos os aparelhos agora. Tente de novo em instantes.', 'error');
      setSaindoTodos(false);
    }
  }

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100dvh' }}>
      <Header />
      <main className="mx-auto w-full px-4" style={{ maxWidth: 640, paddingTop: 80, paddingBottom: 120 }}>
        <h1 className="mb-5 mx-1" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 26, color: 'var(--text-primary)' }}>
          Configurações
        </h1>

        <CartaoConfirmarEmail variante="configuracoes" className="mb-6" />

        <ContaGrupo />

        <GrupoAjustes rotulo="Seus lugares" rodape="Casa e trabalho aparecem primeiro quando você abre a Rota. Ficam na sua conta e só você vê.">
          <CasaTrabalhoCard />
          <LinhaAjuste Icone={Star} titulo="Subprefeituras que acompanho" subtitulo={resumoNomes(favoritos.map((f) => f.nome))}
            to="/app/configuracoes/subprefeituras" direita={<>{favoritos.length > 0 && favoritos.length}<Seta /></>} />
        </GrupoAjustes>

        <AvisosGrupo temLugares={Object.values(locais).some(Boolean)} />

        {/* O rótulo é fixo e o interruptor mostra se o tema escuro está ligado. */}
        <GrupoAjustes rotulo="Aparência">
          <LinhaAjuste Icone={dark ? Moon : Sun} titulo="Tema escuro" ligado={dark} onClick={toggleTheme} direita={<Interruptor ligado={dark} />} />
          <LinhaAjuste Icone={Layers} titulo="Efeito de vidro"
            ligado={vidro.ligada} onClick={vidro.alternar} direita={<Interruptor ligado={vidro.ligada} />} />
        </GrupoAjustes>

        <SobreCard />

        <button type="button" onClick={logout} className="glass-card mt-6 w-full min-h-[52px] rounded-[20px]"
          style={{ color: '#EF4444', fontWeight: 600, fontSize: 15 }}>
          Sair da conta
        </button>

        {/* SEC2 (opção 1): ação rara, colada no "Sair" de sempre; a confirmação explica em uma folha. */}
        <button
          type="button"
          onClick={() => setFolhaSairTodos(true)}
          className="block mx-auto mt-2 min-h-[44px] underline underline-offset-[3px]"
          style={{ fontSize: 14, color: 'var(--text-muted)' }}
        >
          Sair de todos os aparelhos
        </button>

        <FolhaInferior
          aberta={folhaSairTodos}
          onFechar={() => { if (!saindoTodos) setFolhaSairTodos(false); }}
          tituloId="titulo-sair-todos"
        >
          <h2 id="titulo-sair-todos" className="text-center" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>
            Sair de todos os aparelhos?
          </h2>
          <p className="mt-1.5 text-center" style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            A sessão termina no celular, no computador e aqui. Seus lugares e alertas continuam salvos.
          </p>
          <button
            type="button"
            onClick={confirmarSairDeTodos}
            disabled={saindoTodos}
            className="botao-destrutivo mt-5 w-full min-h-[50px] rounded-[14px] inline-flex items-center justify-center gap-2 disabled:opacity-80"
            style={{ fontWeight: 700, fontSize: 15 }}
          >
            {saindoTodos && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {saindoTodos ? 'Saindo…' : 'Sair de todos'}
          </button>
          <button
            type="button"
            data-foco-inicial
            onClick={() => setFolhaSairTodos(false)}
            disabled={saindoTodos}
            className="mt-1.5 w-full min-h-[50px] rounded-[14px]"
            style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 15 }}
          >
            Cancelar
          </button>
        </FolhaInferior>
      </main>
    </div>
  );
}
