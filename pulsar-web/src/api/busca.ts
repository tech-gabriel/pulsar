import api from './client';

/** A rua mais perto de um ponto (GET /api/busca/rua). Null sem rua ou se a busca falhar. */
export async function buscarRuaPerto(lat: number, lon: number): Promise<string | null> {
  try {
    const { data } = await api.get<{ rua: string | null }>('/busca/rua', { params: { lat, lon } });
    return data.rua;
  } catch {
    return null; // o rótulo fica com o nome da região
  }
}
