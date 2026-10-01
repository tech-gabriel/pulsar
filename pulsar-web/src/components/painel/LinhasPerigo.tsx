import { CloudRain, Thermometer, Wind } from 'lucide-react';
import type { LeituraDto, ScoreDto } from '../../types';
import { coresParaFaixa, labelFaixa } from '../../utils/risco';

const num = (v: number, casas = 0) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas });

/** Uma linha por perigo: faixa + o dado que explica o número. */
export default function LinhasPerigo({ score, leitura }: {
  score: ScoreDto | null | undefined;
  leitura: LeituraDto | null | undefined;
}) {
  const c = score?.componentes;
  if (!score || !c) return null;

  const linhas = [
    {
      nome: 'Alagamento', Icon: CloudRain, comp: c.alagamento,
      dado: `${num(score.chuva3hMm ?? 0, 1)} mm em 3h · ${num(score.chuva48hMm ?? 0, 1)} mm em 48h`,
    },
    { nome: 'Vento', Icon: Wind, comp: c.vento, dado: leitura ? `${num(leitura.ventoKmH)} km/h` : '' },
    { nome: 'Calor', Icon: Thermometer, comp: c.calor, dado: leitura ? `sensação ${num(leitura.sensacaoTermica)} °C` : '' },
  ];

  return (
    <ul className="mt-1 space-y-1" aria-label="Risco por perigo">
      {linhas.map(({ nome, Icon, comp, dado }) => (
        <li key={nome} className="flex items-center justify-between gap-2 text-xs">
          <span className="flex items-center gap-1.5 text-pulsar-100">
            <Icon size={13} aria-hidden="true" />
            <span>{nome}</span>
          </span>
          <span className="flex items-center gap-2">
            {dado && <span className="text-pulsar-300">{dado}</span>}
            <span className="font-medium" style={{ color: coresParaFaixa(comp.faixa).fill }}>
              {labelFaixa(comp.faixa)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
