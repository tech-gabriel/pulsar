import api from './client';

export interface RuaPerto {
  rua: string;
  /** Distância do ponto até o endereço que nomeou a rua, em metros. */
  metros: number;
}

/** A rua mais perto de um ponto (GET /api/busca/rua). Null sem rua ou se a busca falhar. */
export async function buscarRuaPerto(lat: number, lon: number): Promise<RuaPerto | null> {
  try {
    const { data } = await api.get<{ rua: string | null; metros: number | null }>('/busca/rua', { params: { lat, lon } });
    return data.rua ? { rua: data.rua, metros: data.metros ?? 0 } : null;
  } catch {
    return null; // o rótulo fica com o nome da região
  }
}
