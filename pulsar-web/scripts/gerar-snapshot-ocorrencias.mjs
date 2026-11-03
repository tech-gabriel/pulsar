// pulsar-web/scripts/gerar-snapshot-ocorrencias.mjs
// Gera src/data/ocorrencias-snapshot.json com as ocorrências de alagamento e
// inundação da Defesa Civil por subprefeitura, lidas do WFS público do GeoSampa
// (as mesmas camadas do GeoSampaClient do backend). Sem banco, sem segredo.
//
// Roda em todo build (npm run build) com --manter-se-falhar: se o GeoSampa cair,
// o build segue com o último JSON commitado em vez de quebrar o deploy. O deploy
// semanal agendado (.github/workflows/deploy.yml, segunda) é o que mantém
// os números frescos. À mão: npm run snapshot:ocorrencias.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const WFS = 'https://wfs.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/wfs';
const CAMADAS = ['geoportal:risco_ocorrencia_alagamento', 'geoportal:risco_ocorrencia_inundacao'];

// nm_subprefeitura vem como "SIGLA - NOME", com grafias antigas e caixa variável
// ("MP - Sao Miguel Paulista", "AF - ARICANDUVA/VILA FORMOSA"). A sigla é estável.
// Os slugs são os de src/data/regioes-seo.ts; o teste seo-consistencia.test.ts
// garante que este mapa e o .ts não divergem (o .ts não é importável em todo Node).
const SIGLA_PARA_SLUG = {
  SE: 'se', AF: 'aricanduva-formosa-carrao', CT: 'cidade-tiradentes', EM: 'ermelino-matarazzo',
  G: 'guaianases', IT: 'itaim-paulista', IQ: 'itaquera', MO: 'mooca', PE: 'penha',
  SB: 'sapopemba', SM: 'sao-mateus', MP: 'sao-miguel', VP: 'vila-prudente',
  CV: 'casa-verde-limao-cachoeirinha', FO: 'freguesia-brasilandia', JT: 'jacana-tremembe',
  PR: 'perus-anhanguera', PJ: 'pirituba-jaragua', ST: 'santana-tucuruvi',
  MG: 'vila-maria-vila-guilherme', BT: 'butanta', LA: 'lapa', PI: 'pinheiros',
  CL: 'campo-limpo', CS: 'capela-do-socorro', AD: 'cidade-ademar', IP: 'ipiranga',
  JA: 'jabaquara', MB: 'mboi-mirim', PA: 'parelheiros', SA: 'santo-amaro', VM: 'vila-mariana',
};

/** Agrega features GeoJSON por slug. Lança se aparecer sigla desconhecida. */
export function agregar(features) {
  const porSlug = Object.fromEntries(Object.values(SIGLA_PARA_SLUG).map((s) => [s, { total: 0, porMes: {}, ultima: null }]));
  const desconhecidas = new Set();
  let de = null, ate = null;
  for (const f of features) {
    const data = String(f.properties.dt_ocorrencia ?? '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) continue;
    const sigla = String(f.properties.nm_subprefeitura ?? '').split(' - ')[0].trim().toUpperCase();
    const slug = SIGLA_PARA_SLUG[sigla];
    if (!slug) { desconhecidas.add(f.properties.nm_subprefeitura); continue; }
    const s = porSlug[slug];
    s.total++;
    s.porMes[data.slice(0, 7)] = (s.porMes[data.slice(0, 7)] ?? 0) + 1;
    if (!s.ultima || data > s.ultima) s.ultima = data;
    if (!de || data < de) de = data;
    if (!ate || data > ate) ate = data;
  }
  if (desconhecidas.size) throw new Error(`Subprefeituras sem mapeamento: ${[...desconhecidas].join(', ')}`);
  const out = {};
  for (const [slug, s] of Object.entries(porSlug)) {
    const mesPico = Object.entries(s.porMes).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
    out[slug] = { total: s.total, mesPico, ultima: s.ultima };
  }
  return { periodo: { de, ate }, subprefeituras: out };
}

const arred = (n) => Math.round(n * 1e5) / 1e5;

/**
 * Pontos para a página "Pontos de alagamento em SP hoje" (public/pontos-alagamento.json).
 * ACUMULA entre builds: a camada do GeoSampa parece zerar na virada do ano, e sem o histórico
 * a página ficaria vazia em janeiro, no pico da chuva. Junta os anteriores aos novos sem repetir
 * o cd_identificador (o novo vence) e guarda 12 meses contados da ocorrência mais recente.
 */
export function acumularPontos(anteriores, features) {
  const porId = new Map(anteriores.map((p) => [p.id, p]));
  for (const f of features) {
    const data = String(f.properties?.dt_ocorrencia ?? '').slice(0, 10);
    const sigla = String(f.properties?.nm_subprefeitura ?? '').split(' - ')[0].trim().toUpperCase();
    const sub = SIGLA_PARA_SLUG[sigla];
    const [lon, lat] = f.geometry?.coordinates ?? [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !sub || typeof lat !== 'number' || typeof lon !== 'number') continue;
    const tipo = String(f.properties?.dc_tipo_ocorrencia ?? '').toUpperCase() === 'INUNDACAO' ? 'INUNDACAO' : 'ALAGAMENTO';
    const id = String(f.properties?.cd_identificador ?? `${data}:${lat}:${lon}`);
    porId.set(id, { id, lat: arred(lat), lon: arred(lon), tipo, data, sub });
  }
  const todos = [...porId.values()];
  const ate = todos.reduce((m, p) => (p.data > m ? p.data : m), '');
  const corte = ate ? `${Number(ate.slice(0, 4)) - 1}${ate.slice(4)}` : '';
  const pontos = todos.filter((p) => p.data >= corte).sort((a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id));
  const de = pontos.reduce((m, p) => (!m || p.data < m ? p.data : m), null);
  return { periodo: { de, ate: pontos.length ? ate : null }, pontos };
}

const PONTOS_EM_PRODUCAO = 'https://app-pulsar.com.br/pontos-alagamento.json';

/**
 * Base do acúmulo: o arquivo que está no ar. O build do CI não commita o que acumulou, então
 * partir só do arquivo do repositório perderia tudo o que foi publicado desde o último commit.
 * Produção fora: cai no arquivo do repositório; sem nenhum dos dois, começa vazio.
 */
export async function lerPontosAnteriores(fetchFn, lerLocal) {
  try {
    const r = await fetchFn(PONTOS_EM_PRODUCAO, { signal: AbortSignal.timeout(30_000) });
    if (r.ok) {
      const j = await r.json();
      if (Array.isArray(j?.pontos)) return j.pontos;
    }
  } catch {
    /* produção fora: usa o local */
  }
  return lerLocal()?.pontos ?? [];
}

/** O GeoSampa respondendo sem nenhuma ocorrência (a camada parece zerar na virada do ano) é falha, não "zero". */
export function exigirOcorrencias(features) {
  if (features.length === 0) throw new Error('GeoSampa respondeu sem nenhuma ocorrência; mantendo o snapshot anterior');
}

async function main() {
  const dest = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'ocorrencias-snapshot.json');
  try {
    const features = [];
    for (const camada of CAMADAS) {
      const url = `${WFS}?service=WFS&version=2.0.0&request=GetFeature&typeNames=${camada}`
        + '&outputFormat=application/json&srsName=urn:ogc:def:crs:EPSG::4326';
      const res = await fetch(url, { signal: AbortSignal.timeout(90_000) });
      if (!res.ok) throw new Error(`GeoSampa ${camada}: HTTP ${res.status}`);
      // Falha de camada aborta tudo: snapshot parcial subnotificaria em silêncio.
      features.push(...(await res.json()).features);
    }
    exigirOcorrencias(features);
    const out = { geradoEm: new Date().toISOString().slice(0, 10), ...agregar(features) };
    writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');
    console.log(`Snapshot de ocorrências: ${features.length} (${out.periodo.de} a ${out.periodo.ate})`);

    // Pontos da página pública, acumulados com o arquivo anterior (servido de public/, compacto).
    const destPontos = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'pontos-alagamento.json');
    const anteriores = await lerPontosAnteriores(fetch, () => (existsSync(destPontos) ? JSON.parse(readFileSync(destPontos, 'utf8')) : null));
    const pontos = { geradoEm: out.geradoEm, ...acumularPontos(anteriores, features) };
    writeFileSync(destPontos, JSON.stringify(pontos) + '\n');
    console.log(`Pontos de alagamento: ${pontos.pontos.length} (${pontos.periodo.de} a ${pontos.periodo.ate})`);
  } catch (err) {
    if (process.argv.includes('--manter-se-falhar') && existsSync(dest)) {
      console.warn(`AVISO: snapshot de ocorrências não atualizado, mantendo o anterior. ${err.message}`);
      return;
    }
    throw err;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
