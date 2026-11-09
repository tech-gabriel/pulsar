import { BellRing, CalendarDays, CloudRain, House, Smartphone, TriangleAlert, type LucideIcon } from 'lucide-react';
import { GrupoAjustes, Interruptor, LinhaAjuste } from './GrupoAjustes';
import { useNotificacoesPrefs, type NotificacoesPrefs } from '../../hooks/useNotificacoesPrefs';
import { usePushSubscription, type EstadoPush } from '../../hooks/usePushSubscription';

const PREFS: { chave: keyof NotificacoesPrefs; Icone: LucideIcon; titulo: string; descricao: string }[] = [
  { chave: 'alertaAlto', Icone: TriangleAlert, titulo: 'Alertas', descricao: 'Quando entrar em Alerta' },
  { chave: 'alertaModerado', Icone: CloudRain, titulo: 'Avisos de atenção', descricao: 'Atenção ou chuva forte prevista' },
  { chave: 'chuvaLocais', Icone: House, titulo: 'Chuva em casa e no trabalho', descricao: 'Quando começar a chover na região deles' },
  { chave: 'resumoDiario', Icone: CalendarDays, titulo: 'Resumo diário', descricao: 'Uma vez por dia' },
];

const ESTADO: Record<EstadoPush, string> = {
  carregando: 'Verificando…',
  ativo: 'Ligados',
  inativo: 'Desligados',
  negado: 'Bloqueados no navegador',
  indisponivel: 'Indisponíveis aqui',
};

/**
 * Grupo "Avisos": o push neste aparelho (Web Push) e as preferências do que avisar. A chuva em
 * casa e no trabalho só aparece para quem salvou um dos dois (F4b).
 */
export default function AvisosGrupo({ temLugares }: { temLugares: boolean }) {
  const { prefs, toggle } = useNotificacoesPrefs();
  const push = usePushSubscription(prefs);

  const acao = push.estado === 'ativo' ? (
    <button type="button" onClick={() => void push.desativar()} disabled={push.ocupado} className="min-h-11 px-1"
      style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-accent)' }}>
      {push.ocupado ? '…' : 'Desativar'}
    </button>
  ) : push.estado === 'inativo' ? (
    <button type="button" onClick={() => void push.ativar()} disabled={push.ocupado} aria-label="Ativar avisos neste aparelho"
      className="btn-gradient px-4 min-h-9" style={{ fontSize: 14, borderRadius: 999 }}>
      {push.ocupado ? 'Ativando…' : 'Ativar'}
    </button>
  ) : null;

  const rodape = push.estado === 'negado'
    ? 'Os avisos estão bloqueados para este site. Reative a permissão nas configurações do navegador para receber alertas.'
    : push.estado === 'indisponivel'
      ? 'Preferências salvas neste aparelho. Os avisos no celular não estão disponíveis aqui no momento.'
      : undefined;

  return (
    <GrupoAjustes rotulo="Avisos" rodape={rodape}>
      <LinhaAjuste Icone={push.estado === 'ativo' ? BellRing : Smartphone} titulo="Avisos neste aparelho"
        subtitulo={ESTADO[push.estado]} direita={acao} />
      {PREFS.filter((n) => temLugares || n.chave !== 'chuvaLocais').map((n) => (
        <LinhaAjuste key={n.chave} Icone={n.Icone} titulo={n.titulo} subtitulo={n.descricao}
          ligado={prefs[n.chave]} onClick={() => toggle(n.chave)} direita={<Interruptor ligado={prefs[n.chave]} />} />
      ))}
    </GrupoAjustes>
  );
}
