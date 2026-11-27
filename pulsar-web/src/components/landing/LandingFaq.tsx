import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { DURACAO, EASE_SUAVE } from '../../motion/presets';

const PERGUNTAS: { q: string; a: string }[] = [
  {
    q: 'O Pulsar é gratuito?',
    a: 'Sim. Criar uma conta e acompanhar o mapa de risco, o painel e os alertas não custa nada, e não pedimos cartão de crédito.',
  },
  {
    q: 'De onde vêm os dados?',
    a: 'De fontes oficiais e públicas. Em São Paulo, a chuva medida vem dos postos do CGE-SP (Centro de Gerenciamento de Emergências de São Paulo) e das estações do CEMADEN, os alagamentos ativos vêm do CGE-SP e o histórico de alagamentos, do GeoSampa, da Prefeitura. Na Baixada Santista, a chuva medida vem das estações do CEMADEN e as áreas de risco de inundação, do Serviço Geológico do Brasil. Onde não há estação perto, vale a chuva estimada pelo OpenWeatherMap, conferida com o Open-Meteo. Os alertas oficiais vêm da Defesa Civil. Atualizamos tudo a cada 15 minutos.',
  },
  {
    q: 'Onde o Pulsar funciona?',
    a: 'Em São Paulo e na Baixada Santista. Na capital, o mapa cobre as 32 subprefeituras. Na Baixada, os 9 municípios: Bertioga, Cubatão, Guarujá, Itanhaém, Mongaguá, Peruíbe, Praia Grande, Santos e São Vicente.',
  },
  {
    q: 'O que é o Score de Perigo?',
    a: 'É um índice de 0 a 100 calculado para cada subprefeitura da capital e cada município da Baixada a partir dos dados climáticos mais recentes. Quanto maior, maior a atenção recomendada para aquela região naquele momento. Até 30 é Tranquilo, até 60 Atenção e acima disso, Alerta.',
  },
  {
    q: 'Como o Score de Perigo é calculado?',
    a: 'O Pulsar mede três perigos em cada região: alagamento, vento forte e calor extremo. O de alagamento considera a chuva da última hora, das últimas 3 horas e dos últimos dois dias, que encharca o solo, além do histórico de ocorrências da Defesa Civil na capital e das áreas de risco de inundação do Serviço Geológico do Brasil na Baixada. O Score exibido é o pior dos três, e o app mostra qual deles pesou. Os critérios foram testados contra alagamentos de verdade: os registrados em 2026 na capital e os noticiados em 2025 e 2026 na Baixada.',
  },
  {
    q: 'Como recebo os alertas?',
    a: 'Dentro do app você vê em destaque as regiões em Alerta. Você também escolhe as regiões que acompanha, como casa e trabalho, e ativa notificações para ser avisado quando elas mudarem de patamar.',
  },
  {
    q: 'O Pulsar substitui a Defesa Civil?',
    a: 'Não. O Pulsar é uma ferramenta de apoio à decisão para o dia a dia. Em emergências, siga sempre as orientações oficiais da Defesa Civil e dos órgãos competentes.',
  },
];

function Item({ q, a, aberto, onToggle, id }: { q: string; a: string; aberto: boolean; onToggle: () => void; id: number }) {
  return (
    <div className="landing-faq-item">
      <button
        type="button"
        className="landing-faq-q"
        onClick={onToggle}
        aria-expanded={aberto}
        aria-controls={`faq-resposta-${id}`}
      >
        <span>{q}</span>
        <motion.span
          className="landing-faq-chevron"
          animate={{ rotate: aberto ? 180 : 0 }}
          transition={{ duration: DURACAO.media, ease: EASE_SUAVE }}
        >
          <ChevronDown size={20} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {aberto && (
          <motion.div
            id={`faq-resposta-${id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DURACAO.media, ease: EASE_SUAVE }}
            style={{ overflow: 'hidden' }}
          >
            <p className="landing-faq-a">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LandingFaq() {
  const [aberto, setAberto] = useState<number | null>(0);

  return (
    <section id="faq" className="landing-section">
      <div data-revelar>
        <p className="lp-rotulo">Perguntas frequentes</p>
        <h2 className="lp-h2 mt-3 max-w-2xl">Ainda com dúvidas?</h2>
      </div>

      <div data-revelar>
        <div className="mt-10 max-w-3xl flex flex-col gap-3">
          {PERGUNTAS.map(({ q, a }, i) => (
            <Item
              key={q}
              id={i}
              q={q}
              a={a}
              aberto={aberto === i}
              onToggle={() => setAberto(aberto === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
