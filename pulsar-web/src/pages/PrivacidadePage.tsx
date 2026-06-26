import LandingDocShell from '../components/landing/LandingDocShell';

/**
 * Política de Privacidade (rota pública `/privacidade`). Texto base alinhado à
 * LGPD; deve ser revisado por responsável antes do lançamento público.
 */
export default function PrivacidadePage() {
  return (
    <LandingDocShell
      titulo="Política de Privacidade"
      subtitulo="Como o Pulsar coleta, usa e protege seus dados."
      atualizadoEm="26 de junho de 2026"
    >
      <h2>1. Quem somos</h2>
      <p>
        O Pulsar é um projeto independente de monitoramento climático da cidade de São Paulo.
        Esta política explica, de forma direta, quais dados tratamos e por quê, em linha com a
        Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018).
      </p>

      <h2>2. Dados que coletamos</h2>
      <ul>
        <li>
          <strong>Dados de conta:</strong> nome e e-mail informados no cadastro. Se você entrar
          com o Google, recebemos os dados básicos de perfil que você autorizar.
        </li>
        <li>
          <strong>Preferências de uso:</strong> regiões favoritas, tema (claro/escuro) e
          configurações de notificação.
        </li>
        <li>
          <strong>Dados técnicos:</strong> informações mínimas necessárias para autenticar sua
          sessão e manter o serviço funcionando com segurança.
        </li>
      </ul>
      <p>
        O Pulsar <strong>não</strong> coleta sua localização precisa em segundo plano. Os dados
        climáticos mostrados vêm de fontes públicas e não dependem do rastreamento do seu
        dispositivo.
      </p>

      <h2>3. Como usamos os dados</h2>
      <ul>
        <li>Autenticar seu acesso e manter sua conta.</li>
        <li>Personalizar a experiência (regiões favoritas, tema).</li>
        <li>Enviar alertas e notificações que você ativou.</li>
        <li>Enviar e-mails essenciais, como recuperação de senha.</li>
      </ul>
      <p>Não vendemos seus dados e não usamos seus dados para anúncios.</p>

      <h2>4. Notificações</h2>
      <p>
        As notificações push são opcionais e só são enviadas após o seu consentimento explícito.
        Você pode desativá-las a qualquer momento nas configurações do app ou do navegador.
      </p>

      <h2>5. Compartilhamento com terceiros</h2>
      <p>
        Usamos prestadores de serviço para operar o Pulsar (por exemplo, envio de e-mails e
        infraestrutura de hospedagem). Esses parceiros tratam os dados apenas conforme nossas
        instruções e na medida necessária para prestar o serviço.
      </p>

      <h2>6. Seus direitos</h2>
      <p>
        Você pode solicitar acesso, correção ou exclusão dos seus dados, bem como a exclusão da
        sua conta. Para isso, entre em contato pelo e-mail abaixo.
      </p>

      <h2>7. Retenção e segurança</h2>
      <p>
        Mantemos seus dados apenas enquanto sua conta estiver ativa ou pelo tempo necessário
        para cumprir obrigações legais. Adotamos medidas técnicas razoáveis para proteger essas
        informações.
      </p>

      <h2>8. Contato</h2>
      <p>
        Dúvidas sobre privacidade? Fale com a gente em{' '}
        <a href="mailto:tech.gabrielleite@gmail.com">tech.gabrielleite@gmail.com</a>.
      </p>
    </LandingDocShell>
  );
}
