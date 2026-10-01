import { describe, it, expect } from 'vitest';
import { motivoPerigo } from '../../utils/risco';

describe('motivoPerigo', () => {
  it('não mostra motivo quando o principal é alagamento ou não veio', () => {
    expect(motivoPerigo('ALAGAMENTO', 'ALTO')).toBeNull();
    expect(motivoPerigo(undefined, 'ALTO')).toBeNull();
    expect(motivoPerigo(null, 'ALTO')).toBeNull();
  });

  it('mostra ícone e rótulo para vento e calor quando há risco', () => {
    expect(motivoPerigo('VENTO', 'MODERADO')).toEqual({ icone: '💨', rotulo: 'vento' });
    expect(motivoPerigo('CALOR', 'ALTO')).toEqual({ icone: '🌡️', rotulo: 'calor' });
  });

  it('em dia tranquilo (BAIXO) não explica nada: brisa não é motivo de risco', () => {
    expect(motivoPerigo('VENTO', 'BAIXO')).toBeNull();
    expect(motivoPerigo('CALOR', 'BAIXO')).toBeNull();
    expect(motivoPerigo('VENTO', undefined)).toBeNull();
  });
});
