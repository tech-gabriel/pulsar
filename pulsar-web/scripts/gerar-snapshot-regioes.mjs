// pulsar-web/scripts/gerar-snapshot-regioes.mjs
// Gera src/data/regioes-snapshot.json com as estatísticas do rollup por página de SEO,
// lidas do endpoint público da API (GET /api/estatisticas/regioes). Sem banco, sem segredo.
//
// Roda em todo build (npm run build) com --manter-se-falhar: se a API estiver fora ou
// responder algo inesperado, o build segue com o último JSON commitado. O deploy semanal
// agendado (.github/workflows/atualizar-ocorrencias.yml) mantém os números frescos.
// À mão: npm run snapshot:regioes (PULSAR_API_URL=http://localhost:5245 para a API local).
import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const API = process.env.PULSAR_API_URL ?? 'https://pulsar-api-1v0n.onrender.com';
const TOTAIS = { subprefeituras: 32, zonas: 5 };

/**
 * Confere o formato da resposta e devolve o snapshot a gravar. Lança se algo não bater:
 * o gerar-sitemap.mjs lista as páginas de zona pelas chaves deste JSON.
 */
export function validar(dados) {
  if (!dados || typeof dados !== 'object') throw new Error('resposta não é um objeto JSON');
  if (typeof dados.janelaDias !== 'number') throw new Error('janelaDias ausente');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dados.geradoEm))) throw new Error(`geradoEm inválido: ${dados.geradoEm}`);
  for (const [campo, total] of Object.entries(TOTAIS)) {
    const grupo = dados[campo];
    if (!grupo || typeof grupo !== 'object') throw new Error(`${campo} ausente`);
    const n = Object.keys(grupo).length;
    if (n !== total) throw new Error(`${campo}: esperava ${total} chaves, veio ${n}`);
    for (const [slug, v] of Object.entries(grupo)) {
      if (v !== null && typeof v?.diasCompletos !== 'number') throw new Error(`${campo}.${slug} sem diasCompletos`);
    }
  }
  return {
    geradoEm: dados.geradoEm,
    janelaDias: dados.janelaDias,
    subprefeituras: dados.subprefeituras,
    zonas: dados.zonas,
  };
}

async function main() {
  const dest = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'regioes-snapshot.json');
  try {
    // 60 s: a API no Render pode estar acordando.
    const res = await fetch(`${API}/api/estatisticas/regioes`, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`API: HTTP ${res.status}`);
    const out = validar(await res.json());
    writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');
    const acesas = Object.values(out.subprefeituras).filter((v) => v && v.diasCompletos >= 60).length;
    console.log(`Snapshot de regiões: ${out.geradoEm}, ${acesas}/32 subprefeituras com 60+ dias completos`);
  } catch (err) {
    if (process.argv.includes('--manter-se-falhar') && existsSync(dest)) {
      console.warn(`AVISO: snapshot de regiões não atualizado, mantendo o anterior. ${err.message}`);
      return;
    }
    throw err;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
