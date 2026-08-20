import { CloudLightning, CloudRain, CloudDrizzle, Cloud, Sun, type LucideIcon } from 'lucide-react';
import { PALETA } from '../../utils/paleta';

/**
 * Códigos de condição do OpenWeatherMap agrupados pela centena, que é como a
 * própria API os organiza: 2xx trovoada, 3xx garoa, 5xx chuva, 6xx neve,
 * 7xx atmosfera, 800 céu limpo, 80x nuvens.
 *
 * Função pura de propósito: é testável sem renderizar nada, e o componente fica
 * só com a apresentação. Neve (6xx) não recebe tratamento próprio porque não
 * acontece na área coberta; cai no fallback.
 */
export function iconeCondicao(codigo: number): LucideIcon {
  if (codigo >= 200 && codigo < 300) return CloudLightning;
  if (codigo >= 300 && codigo < 400) return CloudDrizzle;
  if (codigo >= 500 && codigo < 600) return CloudRain;
  if (codigo === 800) return Sun;
  return Cloud;
}

/** Tom da paleta para o ícone. Nunca hex próprio: ver o comentário em utils/paleta.ts. */
export function corCondicao(codigo: number): string {
  if (codigo >= 200 && codigo < 300) return PALETA.roxo;
  if (codigo >= 300 && codigo < 400) return PALETA.azul;
  if (codigo >= 500 && codigo < 600) return PALETA.azulProfundo;
  if (codigo === 800) return PALETA.amarelo;
  return PALETA.neutro;
}
