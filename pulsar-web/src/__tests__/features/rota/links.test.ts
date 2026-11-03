import { describe, it, expect } from 'vitest';
import { linksNavegacao } from '../../../features/rota/links';

describe('linksNavegacao', () => {
  it('monta os três links em modo carro', () => {
    const l = linksNavegacao({ lat: -23.55, lon: -46.63, rotulo: 'a' }, { lat: -23.56, lon: -46.6, rotulo: 'b' });
    expect(l.google).toBe('https://www.google.com/maps/dir/?api=1&origin=-23.55,-46.63&destination=-23.56,-46.6&travelmode=driving');
    expect(l.waze).toBe('https://waze.com/ul?ll=-23.56,-46.6&navigate=yes');
    expect(l.apple).toBe('https://maps.apple.com/?saddr=-23.55,-46.63&daddr=-23.56,-46.6&dirflg=d');
  });
});
