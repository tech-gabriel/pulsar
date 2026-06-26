import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { DURACAO, EASE_SUAVE } from '../../motion/presets';
import Reveal from './Reveal';

const PERGUNTAS: { q: string; a: string }[] = [
  {
    q: 'O Pulsar é gratuito?',
    a: 'Sim. Criar uma conta e acompanhar o mapa de risco, o painel e os alertas não custa nada, e não pedimos cartão de crédito.',
  },
  {
    q: 'De onde vêm os dados?',
    a: 'De fontes oficiais e públicas: as condições climáticas vêm do OpenWeatherMap e os boletins e ocorrências, da CGE-SP (Centro de Gerenciamento de Emergências de São Paulo). Atualizamos tudo a cada 15 minutos.',
  },
  {
    q: 'Para qual cidade o Pulsar funciona?',
    a: 'Hoje cobrimos a cidade de São Paulo inteira, dividida nas suas 32 subprefeituras. A arquitetura já foi pensada para crescer para outras regiões no futuro.',
  },
  {
    q: 'O que é o Score de Perigo?',
    a: 'É um índice de 0 a 100 calculado por subprefeitura a partir dos dados climáticos mais recentes (chuva, vento, temperatura e outros). Quanto maior, maior a atenção recomendada para aquela região naquele momento.',
  },
  {
    q: 'Como recebo os alertas?',
    a: 'Dentro do app você vê em destaque as regiões em risco alto. Você também pode favoritar suas regiões e ativar notificações para ser avisado quando elas mudarem de patamar.',
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
      <Reveal>
        <p className="uppercase tracking-[0.18em] text-xs font-semibold" style={{ color: 'var(--text-accent)' }}>
          Perguntas frequentes
        </p>
        <h2
          className="mt-3 max-w-2xl leading-tight"
          style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'clamp(26px, 3.5vw, 38px)', color: 'var(--text-primary)' }}
        >
          Ainda com dúvidas? <span className="landing-gradient-text">A gente responde</span>
        </h2>
      </Reveal>

      <Reveal delay={0.08}>
        <div className="mt-10 max-w-3xl mx-auto flex flex-col gap-3">
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
      </Reveal>
    </section>
  );
}
