import { useState } from 'react';
import { Newspaper } from 'lucide-react';

interface Props {
  fonte: string;
  fonteUrl: string;
  size?: number;
}

function dominioDe(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Badge identificador da fonte de uma notícia: favicon (derivado do domínio) + nome.
 * Escalável para novas fontes — basta o backend informar `fonteUrl`. Cai para um
 * ícone genérico se o favicon não carregar.
 */
export default function FonteBadge({ fonte, fonteUrl, size = 16 }: Props) {
  const [erro, setErro] = useState(false);
  const dominio = dominioDe(fonteUrl);
  const faviconUrl = dominio ? `https://www.google.com/s2/favicons?domain=${dominio}&sz=64` : '';

  return (
    <span className="inline-flex items-center gap-1.5">
      {!erro && faviconUrl ? (
        <img
          src={faviconUrl}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          onError={() => setErro(true)}
          style={{ borderRadius: 4, display: 'block', flexShrink: 0 }}
        />
      ) : (
        <Newspaper size={size} style={{ color: 'var(--text-muted)' }} />
      )}
      <span style={{ fontWeight: 600 }}>{fonte}</span>
    </span>
  );
}
