import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import LandingDocShell from '../components/landing/LandingDocShell';

/**
 * Página institucional "Sobre" (rota pública `/sobre`). Conta o porquê do
 * projeto e como ele funciona, em tom humano e direto.
 */
export default function SobrePage() {
  return (
    <LandingDocShell
      titulo="Sobre o Pulsar"
      subtitulo="Um mapa vivo do risco climático de São Paulo, feito para ajudar as pessoas a decidir melhor no dia a dia."
    >
      <h2>Por que o Pulsar existe</h2>
      <p>
        Em São Paulo, o tempo muda rápido — e muda de bairro para bairro. Um temporal que
        alaga uma região pode mal molhar a vizinha. Mas os avisos que a maioria de nós recebe
        falam da cidade inteira, em média, e quase sempre chegam quando o transtorno já começou.
      </p>
      <p>
        O Pulsar nasceu para fechar essa lacuna: mostrar, de forma clara e local, qual é o
        risco climático <strong>onde você está, agora</strong>.
      </p>

      <h2>Como funciona, em resumo</h2>
      <p>
        A cada 15 minutos, coletamos as condições climáticas de toda a cidade a partir de
        fontes oficiais. Com esses dados, calculamos um <strong>Score de Perigo</strong> de 0 a 100
        para cada uma das 32 subprefeituras. Você acompanha tudo num mapa de calor e num painel,
        e pode ser avisado quando a sua região mudar de patamar.
      </p>

      <h2>No que acreditamos</h2>
      <ul>
        <li>
          <strong>Transparência.</strong> O cálculo, as fontes e o código são abertos. Informação
          de risco só vale se você puder confiar nela.
        </li>
        <li>
          <strong>Clareza acima de tudo.</strong> Dado bruto não ajuda ninguém na correria. Nosso
          trabalho é transformar números em uma leitura que cabe num olhar.
        </li>
        <li>
          <strong>Gente em primeiro lugar.</strong> Sem anúncios e sem vender seus dados. Você é o
          usuário, não o produto.
        </li>
      </ul>

      <h2>Um complemento, não um substituto</h2>
      <p>
        O Pulsar é uma ferramenta de apoio à decisão. Em situações de emergência, siga sempre as
        orientações oficiais da Defesa Civil e dos órgãos competentes.
      </p>

      <p style={{ marginTop: 32 }}>
        <Link to="/cadastro" className="landing-cta">
          Criar minha conta gratuita
          <ArrowRight size={18} />
        </Link>
      </p>
    </LandingDocShell>
  );
}
