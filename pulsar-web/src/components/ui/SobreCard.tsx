import { useNavigate } from 'react-router-dom';
import { AtSign, ExternalLink, HelpCircle, Info, Sparkles } from 'lucide-react';
import { GrupoAjustes, LinhaAjuste, Seta } from '../configuracoes/GrupoAjustes';
import { track } from '../../analytics';
import { limparAtivacaoVista } from '../../features/ativacao/passos';
import { APP_VERSION } from '../../data/changelog';
import { INSTAGRAM_URL } from '../../data/social';

/** Grupo "Sobre" das Configurações: boas-vindas, novidades, Instagram e a versão do app. */
export default function SobreCard() {
  const navigate = useNavigate();
  return (
    <GrupoAjustes rotulo="Sobre">
      <LinhaAjuste Icone={HelpCircle} titulo="Rever as boas-vindas" direita={<Seta />}
        onClick={() => { limparAtivacaoVista(); navigate('/app/boas-vindas'); }} />
      <LinhaAjuste Icone={Sparkles} titulo="Novidades" subtitulo="O que mudou a cada versão" direita={<Seta />} to="/novidades" />
      <LinhaAjuste Icone={AtSign} titulo="Instagram" subtitulo="@appulsar" href={INSTAGRAM_URL} ariaLabel="Instagram do Pulsar"
        onClickLink={() => track.clicouInstagram('sobre')} direita={<ExternalLink size={15} aria-hidden="true" />} />
      <LinhaAjuste Icone={Info} titulo="Versão" to="/novidades" ariaLabel={`Versão v${APP_VERSION}`}
        direita={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>v{APP_VERSION}</span>} />
    </GrupoAjustes>
  );
}
