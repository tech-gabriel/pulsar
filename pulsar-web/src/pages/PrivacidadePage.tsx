import LandingDocShell from '../components/landing/LandingDocShell';

/**
 * Política de Privacidade (rota pública `/privacidade`). Texto base alinhado à
 * LGPD, já preparado para a monetização futura (anúncios + plano premium).
 * Projeto mantido por pessoa física. Recomenda-se revisão jurídica antes do
 * lançamento público; este texto não constitui aconselhamento jurídico.
 */
export default function PrivacidadePage() {
  return (
    <LandingDocShell
      titulo="Política de Privacidade"
      subtitulo="Como o Pulsar coleta, usa e protege seus dados, em linguagem direta e em conformidade com a LGPD."
      atualizadoEm="27 de junho de 2026"
    >
      <h2>Resumo rápido</h2>
      <ul>
        <li>Coletamos o mínimo: dados de conta, suas preferências e dados técnicos para o serviço funcionar.</li>
        <li>Não vendemos seus dados pessoais.</li>
        <li>Você controla as notificações e pode pedir a exclusão da sua conta a qualquer momento.</li>
        <li>No futuro, o Pulsar poderá exibir anúncios e oferecer um plano premium. Quando isso acontecer, esta política será atualizada antes de qualquer mudança.</li>
      </ul>
      <p>
        O resumo acima é só um guia. O que vale é o texto completo abaixo.
      </p>

      {/* Controlador pessoa física: identificamos pelo projeto + e-mail. Caso você
          queira publicar nome civil/endereço completos, basta acrescentar aqui. */}
      <h2>1. Quem somos e quem é o responsável</h2>
      <p>
        O Pulsar é um projeto independente de monitoramento climático da cidade de São Paulo,
        mantido por uma pessoa física. Para fins da Lei Geral de Proteção de Dados (LGPD, Lei
        nº 13.709/2018), o responsável pelo tratamento dos seus dados (controlador) é o mantenedor
        do projeto, que você pode contatar pelo e-mail indicado no fim desta página. Esse mesmo
        contato funciona como canal do encarregado pelo tratamento de dados.
      </p>

      <h2>2. Dados que coletamos</h2>
      <ul>
        <li>
          <strong>Dados de conta:</strong> nome e e-mail informados no cadastro. Se você entrar
          com o Google, recebemos apenas os dados básicos de perfil que você autorizar (como nome
          e e-mail).
        </li>
        <li>
          <strong>Preferências de uso:</strong> regiões favoritas, tema (claro ou escuro) e suas
          configurações de notificação.
        </li>
        <li>
          <strong>Dados técnicos:</strong> informações mínimas necessárias para autenticar sua
          sessão, manter o serviço seguro e diagnosticar problemas (por exemplo, registros de
          acesso e dados do dispositivo de notificação, quando você ativa o push).
        </li>
        <li>
          <strong>Dados de uso:</strong> informações agregadas sobre como o app é utilizado, que
          nos ajudam a entender o que melhorar. Sempre que possível, de forma que não identifique
          você individualmente.
        </li>
        <li>
          <strong>Dados de pagamento (no futuro):</strong> caso lancemos um plano premium, os
          pagamentos serão processados por um parceiro especializado. Não pretendemos armazenar os
          dados completos do seu cartão; receberíamos apenas as informações necessárias para
          confirmar a assinatura.
        </li>
      </ul>
      <p>
        O Pulsar <strong>não</strong> coleta a sua localização em segundo plano nem faz
        rastreamento contínuo. Quando você toca em "usar minha localização" no mapa, o
        navegador pede sua permissão e usamos as coordenadas apenas naquele momento, no seu
        dispositivo, para descobrir a sua região. Não guardamos essas coordenadas nos nossos
        servidores. Os dados climáticos exibidos vêm de fontes públicas e são organizados por
        subprefeitura.
      </p>

      <h2>3. Para que usamos os dados e com qual base legal</h2>
      <p>Tratamos seus dados para as finalidades abaixo, com as respectivas bases legais da LGPD:</p>
      <ul>
        <li>
          <strong>Criar e manter sua conta e autenticar o acesso:</strong> execução do contrato
          de uso do serviço.
        </li>
        <li>
          <strong>Personalizar a experiência</strong> (regiões favoritas, tema) e
          <strong> enviar as notificações que você ativou:</strong> execução do contrato e,
          no caso do push, o seu consentimento.
        </li>
        <li>
          <strong>Enviar e-mails essenciais</strong> (como recuperação de senha): execução do
          contrato.
        </li>
        <li>
          <strong>Manter a segurança, prevenir fraudes e melhorar o serviço:</strong> legítimo
          interesse, sempre ponderado com os seus direitos.
        </li>
        <li>
          <strong>Cumprir obrigações legais e regulatórias</strong> quando aplicável: cumprimento
          de obrigação legal.
        </li>
        <li>
          <strong>Exibir publicidade e operar planos pagos (no futuro):</strong> execução do
          contrato (planos) e legítimo interesse ou consentimento (anúncios), conforme a
          legislação vigente na época.
        </li>
      </ul>

      <h2>4. Cookies e armazenamento local</h2>
      <p>
        O Pulsar usa o armazenamento do seu navegador (como <em>localStorage</em>) para manter você
        conectado e lembrar preferências, como o tema e o estado do onboarding. Esses itens são
        essenciais para o funcionamento do app. Caso, no futuro, passemos a usar cookies de
        medição ou de publicidade, avisaremos e pediremos seu consentimento quando a lei exigir.
      </p>

      <h2>5. Notificações</h2>
      <p>
        As notificações push são opcionais e só são enviadas após o seu consentimento explícito.
        Você pode desativá-las quando quiser, nas configurações do app ou do próprio navegador.
        Para enviá-las, guardamos os dados técnicos da inscrição do seu dispositivo, que são
        removidos quando você desativa o recurso ou quando a inscrição expira.
      </p>

      <h2>6. Publicidade e monetização (planejado para o futuro)</h2>
      <p>
        Hoje o Pulsar é gratuito e não exibe anúncios. Para manter o projeto no ar e sustentável,
        pretendemos, no futuro, introduzir <strong>anúncios</strong> e um <strong>plano premium</strong> opcional.
        Quando isso acontecer:
      </p>
      <ul>
        <li>Atualizaremos esta política antes de a mudança entrar em vigor.</li>
        <li>Anúncios poderão ser exibidos por parceiros de publicidade, que podem usar tecnologias próprias sujeitas às políticas deles.</li>
        <li>Você terá informações claras sobre quais dados são usados e, quando a lei exigir, poderá consentir ou recusar.</li>
      </ul>
      <p>Em qualquer cenário, <strong>não vendemos seus dados pessoais</strong>.</p>

      <h2>7. Com quem compartilhamos</h2>
      <p>
        Para operar o Pulsar, contamos com prestadores de serviço (operadores) que tratam dados
        apenas conforme nossas instruções e no necessário para prestar o serviço. As categorias
        atuais incluem:
      </p>
      <ul>
        <li><strong>Hospedagem e banco de dados</strong> (infraestrutura onde o app roda e os dados ficam armazenados).</li>
        <li><strong>Envio de e-mails</strong> transacionais (como recuperação de senha).</li>
        <li><strong>Mapas e geocodificação</strong> (para exibir o mapa e a busca por lugares).</li>
        <li><strong>Login social</strong> (caso você opte por entrar com o Google).</li>
        <li><strong>No futuro:</strong> parceiros de publicidade e de processamento de pagamentos.</li>
      </ul>
      <p>
        Também podemos compartilhar dados para cumprir obrigações legais, atender a autoridades
        competentes ou proteger direitos, sempre nos limites da lei.
      </p>

      <h2>8. Transferência internacional de dados</h2>
      <p>
        Alguns desses prestadores podem armazenar ou processar dados em servidores fora do Brasil.
        Nesses casos, adotamos medidas para que a transferência ocorra em conformidade com a LGPD,
        buscando parceiros que ofereçam um grau adequado de proteção aos seus dados.
      </p>

      <h2>9. Por quanto tempo guardamos</h2>
      <p>
        Mantemos seus dados enquanto sua conta estiver ativa ou pelo tempo necessário para cumprir
        as finalidades descritas aqui e eventuais obrigações legais. Ao excluir sua conta,
        removemos ou anonimizamos seus dados pessoais, salvo quando precisarmos retê-los por
        exigência legal.
      </p>

      <h2>10. Segurança</h2>
      <p>
        Adotamos medidas técnicas e organizacionais razoáveis para proteger seus dados, como
        controle de acesso, criptografia das senhas e comunicação por canais seguros. Nenhum
        sistema é totalmente imune a riscos, mas trabalhamos para reduzi-los continuamente.
      </p>

      <h2>11. Seus direitos</h2>
      <p>Como titular dos dados, você pode, a qualquer momento:</p>
      <ul>
        <li>Confirmar a existência de tratamento e acessar seus dados.</li>
        <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
        <li>Solicitar a anonimização, o bloqueio ou a eliminação de dados desnecessários.</li>
        <li>Pedir a portabilidade dos dados, nos termos da lei.</li>
        <li>Revogar o consentimento e excluir sua conta.</li>
        <li>Se opor a tratamentos baseados em legítimo interesse.</li>
      </ul>
      <p>
        Para exercer qualquer um desses direitos, fale com a gente pelo e-mail no fim da página.
        Você também tem o direito de apresentar uma reclamação à Autoridade Nacional de Proteção
        de Dados (ANPD).
      </p>

      <h2>12. Crianças e adolescentes</h2>
      <p>
        O Pulsar não é direcionado a menores de 18 anos. Não coletamos intencionalmente dados de
        crianças e adolescentes sem o consentimento de quem é responsável por eles. Se você é
        responsável e acredita que um menor nos forneceu dados, entre em contato para que possamos
        removê-los.
      </p>

      <h2>13. Alterações nesta política</h2>
      <p>
        Podemos atualizar esta política para refletir melhorias no serviço ou mudanças legais.
        Quando a alteração for relevante, sinalizaremos no app. A data da última atualização fica
        sempre indicada no topo desta página.
      </p>

      <h2>14. Como falar com a gente</h2>
      <p>
        Dúvidas sobre privacidade ou quer exercer seus direitos? Fale com a gente em{' '}
        <a href="mailto:equipe.app.pulsar@gmail.com">equipe.app.pulsar@gmail.com</a>. Respondemos no
        menor prazo possível.
      </p>
    </LandingDocShell>
  );
}
