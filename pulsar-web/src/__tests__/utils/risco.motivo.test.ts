import { describe, it, expect } from 'vitest';
import { motivoPerigo } from '../../utils/risco';

describe('motivoPerigo', () => {
  it('não mostra motivo quando o principal é alagamento ou não veio', () => {
    expect(motivoPerigo('ALAGAMENTO')).toBeNull();
    expect(motivoPerigo(undefined)).toBeNull();
    expect(motivoPerigo(null)).toBeNull();
  });

  it('mostra ícone e rótulo para vento e calor', () => {
    expect(motivoPerigo('VENTO')).toEqual({ icone: '💨', rotulo: 'vento' });
    expect(motivoPerigo('CALOR')).toEqual({ icone: '🌡️', rotulo: 'calor' });
  });
});
