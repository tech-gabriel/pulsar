import { Link } from 'react-router-dom';
import LandingDocShell from '../components/landing/LandingDocShell';

/**
 * Termos de Uso (rota pública `/termos`). Texto base launch-ready, já preparado
 * para a monetização futura (anúncios + plano premium). Projeto mantido por
 * pessoa física. Recomenda-se revisão jurídica antes do lançamento público;
 * este texto não constitui aconselhamento jurídico.
 */
export default function TermosPage() {
  return (
    <LandingDocShell
      titulo="Termos de Uso"
      subtitulo="As regras para usar o Pulsar. Ao criar uma conta ou usar o serviço, você concorda com elas."
      atualizadoEm="27 de junho de 2026"
    >
      <h2>1. O que é o Pulsar</h2>
      <p>
        O Pulsar é uma ferramenta de monitoramento e visualização do risco climático da cidade de
        São Paulo, organizada por subprefeitura. Ele reúne e interpreta dados de fontes públicas
        para apoiar suas decisões do dia a dia. O projeto é mantido por uma pessoa física, de forma
        independente.
      </p>

      <h2>2. Aceite destes termos</h2>
      <p>
        Ao criar uma conta ou usar o Pulsar, você declara que leu e concorda com estes Termos de
        Uso e com a nossa{' '}
        <Link to="/privacidade">Política de Privacidade</Link>. Se você não concordar com algum ponto,
        por favor não utilize o serviço.
      </p>

      <h2>3. Quem pode usar e responsabilidade pela conta</h2>
      <ul>
        <li>O Pulsar é destinado a maiores de 18 anos. Menores só devem usar com o acompanhamento de um responsável.</li>
        <li>As informações de cadastro devem ser verdadeiras e mantidas atualizadas.</li>
        <li>Você é responsável por manter a confidencialidade das suas credenciais.</li>
        <li>O acesso é pessoal. Não compartilhe sua conta com terceiros.</li>
      </ul>

      <h2>4. Natureza informativa do serviço</h2>
      <p>
        O <strong>Score de Perigo</strong> e os alertas do Pulsar são <strong>estimativas</strong>{' '}
        baseadas em dados de terceiros e em modelos próprios. Eles têm caráter informativo e de
        apoio à decisão.
      </p>
      <p>
        O Pulsar <strong>não substitui</strong> os canais oficiais de alerta e emergência. Em
        situações de risco, siga sempre as orientações da Defesa Civil e dos órgãos competentes.
      </p>

      <h2>5. Planos, anúncios e pagamentos</h2>
      <p>
        Hoje o Pulsar é gratuito. Para manter o projeto sustentável, podemos, no futuro,
        introduzir <strong>anúncios</strong> e um <strong>plano premium</strong> opcional, com
        recursos adicionais. Caso isso aconteça:
      </p>
      <ul>
        <li>As condições do plano pago (preço, recursos e renovação) serão informadas com clareza antes da contratação.</li>
        <li>Os pagamentos poderão ser processados por um parceiro especializado, sujeito aos termos dele.</li>
        <li>Os recursos gratuitos disponíveis hoje não serão removidos de forma arbitrária sem aviso.</li>
      </ul>

      <h2>6. Uso aceitável</h2>
      <p>Você concorda em não:</p>
      <ul>
        <li>Tentar comprometer a segurança ou a integridade do serviço.</li>
        <li>Coletar dados de forma automatizada sem autorização (scraping abusivo).</li>
        <li>Sobrecarregar a infraestrutura ou interferir no uso por outras pessoas.</li>
        <li>Usar o Pulsar para fins ilícitos ou que prejudiquem terceiros.</li>
      </ul>

      <h2>7. Propriedade intelectual</h2>
      <p>
        A marca, o design, o código e os conteúdos próprios do Pulsar pertencem ao mantenedor do
        projeto e são protegidos por lei. Os dados climáticos têm origem em fontes públicas e
        permanecem sujeitos às licenças e aos créditos dos seus provedores. Você não pode copiar,
        redistribuir ou explorar comercialmente os elementos próprios do Pulsar sem autorização.
      </p>

      <h2>8. Privacidade</h2>
      <p>
        O tratamento dos seus dados é descrito na nossa{' '}
        <Link to="/privacidade">Política de Privacidade</Link>, que faz parte destes termos.
      </p>

      <h2>9. Disponibilidade e mudanças no serviço</h2>
      <p>
        Trabalhamos para manter o Pulsar no ar e funcionando bem, mas o serviço pode passar por
        manutenções, atualizações ou interrupções. Podemos adicionar, alterar ou descontinuar
        funcionalidades ao longo do tempo.
      </p>

      <h2>10. Limitação de responsabilidade</h2>
      <p>
        O serviço é fornecido "como está". Não garantimos disponibilidade ininterrupta nem a
        exatidão absoluta dos dados, que dependem de fontes externas. Na máxima extensão permitida
        em lei, o Pulsar não se responsabiliza por decisões tomadas com base nas informações
        apresentadas, nem por danos decorrentes de indisponibilidade ou imprecisão dos dados.
      </p>

      <h2>11. Encerramento da conta</h2>
      <p>
        Você pode excluir sua conta quando quiser. Também podemos suspender ou encerrar contas que
        violem estes termos ou a lei, ou que coloquem em risco o serviço e outras pessoas. Sempre
        que possível e razoável, avisaremos antes.
      </p>

      <h2>12. Alterações nestes termos</h2>
      <p>
        Podemos atualizar estes termos ao longo do tempo. Mudanças relevantes serão sinalizadas, e
        o uso contínuo após a atualização indica concordância com a nova versão. A data da última
        atualização fica sempre indicada no topo desta página.
      </p>

      <h2>13. Lei aplicável e foro</h2>
      <p>
        Estes termos são regidos pelas leis brasileiras. Fica eleito o foro da comarca de São
        Paulo (SP) para resolver eventuais conflitos, ressalvado o direito do consumidor de
        ajuizar a demanda no foro do seu próprio domicílio.
      </p>

      <h2>14. Contato</h2>
      <p>
        Dúvidas sobre estes termos? Fale com a gente em{' '}
        <a href="mailto:equipe.app.pulsar@gmail.com">equipe.app.pulsar@gmail.com</a>.
      </p>
    </LandingDocShell>
  );
}
