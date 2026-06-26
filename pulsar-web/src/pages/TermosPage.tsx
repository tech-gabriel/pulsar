import LandingDocShell from '../components/landing/LandingDocShell';

/**
 * Termos de Uso (rota pública `/termos`). Texto base; deve ser revisado por
 * responsável antes do lançamento público.
 */
export default function TermosPage() {
  return (
    <LandingDocShell
      titulo="Termos de Uso"
      subtitulo="As regras para usar o Pulsar. Ao criar uma conta, você concorda com elas."
      atualizadoEm="26 de junho de 2026"
    >
      <h2>1. O que é o Pulsar</h2>
      <p>
        O Pulsar é uma ferramenta gratuita de monitoramento e visualização do risco climático da
        cidade de São Paulo, organizada por subprefeitura. Ele reúne e interpreta dados de fontes
        públicas para apoiar suas decisões do dia a dia.
      </p>

      <h2>2. Uso da conta</h2>
      <ul>
        <li>Você é responsável por manter a confidencialidade das suas credenciais.</li>
        <li>As informações de cadastro devem ser verdadeiras e atualizadas.</li>
        <li>O acesso é pessoal; não compartilhe sua conta com terceiros.</li>
      </ul>

      <h2>3. Natureza informativa do serviço</h2>
      <p>
        O <strong>Score de Perigo</strong> e os alertas do Pulsar são <strong>estimativas</strong>{' '}
        baseadas em dados de terceiros e em modelos próprios. Eles têm caráter informativo e de
        apoio à decisão.
      </p>
      <p>
        O Pulsar <strong>não substitui</strong> os canais oficiais de alerta e emergência. Em
        situações de risco, siga sempre as orientações da Defesa Civil e dos órgãos competentes.
      </p>

      <h2>4. Limitação de responsabilidade</h2>
      <p>
        O serviço é fornecido "como está". Não garantimos disponibilidade ininterrupta nem a
        exatidão absoluta dos dados, que dependem de fontes externas. Na máxima extensão permitida
        em lei, o Pulsar não se responsabiliza por decisões tomadas com base nas informações
        apresentadas, nem por danos decorrentes de indisponibilidade ou imprecisão dos dados.
      </p>

      <h2>5. Uso aceitável</h2>
      <p>Você concorda em não:</p>
      <ul>
        <li>Tentar comprometer a segurança ou a integridade do serviço.</li>
        <li>Coletar dados de forma automatizada sem autorização (scraping abusivo).</li>
        <li>Usar o Pulsar para fins ilícitos ou que prejudiquem terceiros.</li>
      </ul>

      <h2>6. Alterações no serviço e nos termos</h2>
      <p>
        Podemos atualizar funcionalidades e estes termos ao longo do tempo. Mudanças relevantes
        serão sinalizadas, e o uso contínuo após a atualização indica concordância com a nova
        versão.
      </p>

      <h2>7. Contato</h2>
      <p>
        Dúvidas sobre estes termos? Fale com a gente em{' '}
        <a href="mailto:tech.gabrielleite@gmail.com">tech.gabrielleite@gmail.com</a>.
      </p>
    </LandingDocShell>
  );
}
