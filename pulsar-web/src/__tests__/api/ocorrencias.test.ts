import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../api/client', () => ({ default: { get: vi.fn() } }));
import api from '../../api/client';
import { buscarOcorrenciasProximas } from '../../api/ocorrencias';

const mockedApi = api as unknown as { get: ReturnType<typeof vi.fn> };

beforeEach(() => vi.clearAllMocks());

describe('buscarOcorrenciasProximas', () => {
  it('chama o endpoint com lat/lon/raio', async () => {
    mockedApi.get.mockResolvedValue({ data: { total: 0, alagamentos: 0, inundacoes: 0, maisProximaMetros: null, riscoElevado: false, chuvaMmH: null } });
    await buscarOcorrenciasProximas(-23.55, -46.63, 500);
    expect(mockedApi.get).toHaveBeenCalledWith('/ocorrencias/alagamento/proximas', {
      params: { lat: -23.55, lon: -46.63, raioMetros: 500 },
    });
  });

  it('usa raio padrao 500', async () => {
    mockedApi.get.mockResolvedValue({ data: { total: 0, alagamentos: 0, inundacoes: 0, maisProximaMetros: null, riscoElevado: false, chuvaMmH: null } });
    await buscarOcorrenciasProximas(-23.55, -46.63);
    expect(mockedApi.get).toHaveBeenCalledWith('/ocorrencias/alagamento/proximas', {
      params: { lat: -23.55, lon: -46.63, raioMetros: 500 },
    });
  });
});
