import { SUBPREFEITURAS, VIEWBOX } from '../../components/landing/mapaPaths';

/** Mapa real das 32 subprefeituras (GeoSampa). `destaques`: id (slug) do path → cor. */
export default function MapaSP({ destaques = {}, className = 'at-mapa' }: { destaques?: Record<string, string>; className?: string }) {
  return (
    <svg className={className} viewBox={VIEWBOX} aria-hidden="true">
      {SUBPREFEITURAS.map((s) => (
        <path key={s.id} d={s.d} fill={destaques[s.id] ?? 'color-mix(in srgb, var(--color-pulsar-300) 35%, var(--bg-primary))'} stroke="var(--bg-primary)" strokeWidth={6} strokeLinejoin="round" />
      ))}
    </svg>
  );
}
