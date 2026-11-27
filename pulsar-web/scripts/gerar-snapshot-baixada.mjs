// pulsar-web/scripts/gerar-snapshot-baixada.mjs
// Gera src/data/baixada-snapshot.json com os números de cada município da Baixada Santista:
// trechos da grade H3 (fator > 1 = costuma alagar) e pontos de alagamento documentados.
// Sem rede: lê a grade do backend e public/pontos-criticos-baixada.json.
// Roda em todo build com --manter-se-falhar (mantém o JSON commitado se algo falhar).
// Só reescreve o arquivo quando os municípios mudam: sem isso, cada build trocaria o geradoEm
// (e o lastmod do sitemap) sem dado novo.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Mesma regra de slugify de src/data/regioes-seo.ts (o .ts não é importável em todo Node).
const slugify = (nome) => nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/'/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function montar(grade, pontos, hoje = new Date()) {
  const municipios = {};
  const de = (nome) => (municipios[slugify(nome)] ??= { trechos: 0, trechosRisco: 0, pontos: [] });
  for (const c of grade.celulas) {
    const m = de(c.sub);
    m.trechos++;
    if (c.fator > 1) m.trechosRisco++;
  }
  // lat e lon vão junto: as páginas públicas põem os pinos no mapa direto do snapshot, sem fetch.
  for (const p of pontos) de(p.municipio).pontos.push({ nome: p.nome, data: p.data, fonte: p.fonte, lat: p.lat, lon: p.lon });
  for (const m of Object.values(municipios)) m.pontos.sort((a, b) => b.data.localeCompare(a.data));
  return { geradoEm: hoje.toISOString().slice(0, 10), municipios };
}

/** Os municípios mudaram em relação ao snapshot anterior (o geradoEm não conta)? */
export function mudou(anterior, novo) {
  return JSON.stringify(anterior?.municipios) !== JSON.stringify(novo.municipios);
}

function main() {
  const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
  const dest = join(raiz, 'src', 'data', 'baixada-snapshot.json');
  const caminhoGrade = join(raiz, '..', 'Pulsar.API', 'Domain', 'Score', 'grade-baixada-santista.json');
  // O build no Docker só copia pulsar-web/: sem a grade, o commitado é o esperado, não um erro.
  if (!existsSync(caminhoGrade) && existsSync(dest)) {
    console.log('Snapshot da Baixada: sem a grade do backend neste build, usando o commitado.');
    return;
  }
  try {
    const grade = JSON.parse(readFileSync(caminhoGrade, 'utf8'));
    const pontos = JSON.parse(readFileSync(join(raiz, 'public', 'pontos-criticos-baixada.json'), 'utf8'));
    const out = montar(grade, pontos);
    const anterior = existsSync(dest) ? JSON.parse(readFileSync(dest, 'utf8')) : null;
    if (!mudou(anterior, out)) {
      console.log('Snapshot da Baixada: sem mudança, mantendo o arquivo.');
      return;
    }
    writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');
    console.log(`Snapshot da Baixada: ${Object.keys(out.municipios).length} municípios`);
  } catch (err) {
    if (process.argv.includes('--manter-se-falhar') && existsSync(dest)) {
      console.warn(`AVISO: snapshot da Baixada não atualizado, mantendo o anterior. ${err.message}`);
      return;
    }
    throw err;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
