// pulsar-web/scripts/gerar-snapshot-regioes.mjs
// Gera src/data/regioes-snapshot.json lendo o Supabase direto.
// Uso: PULSAR_DB_URL="postgres://..." node scripts/gerar-snapshot-regioes.mjs
// Roda à mão periodicamente (dev). NÃO roda no build do Render.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const JANELA_DIAS = 90;
const FAIXA = { 0: 'BAIXO', 1: 'MODERADO', 2: 'ALTO' };

const conn = process.env.PULSAR_DB_URL;
if (!conn) {
  console.error('Defina PULSAR_DB_URL com a connection string do Supabase.');
  process.exit(1);
}

// TLS verificado (não desabilitar rejectUnauthorized — evita MITM). A connection
// string deve incluir sslmode=require; o cert do Supabase é publicamente confiável.
// Se a verificação falhar no seu ambiente, baixe a CA do Supabase e passe
// ssl: { ca: readFileSync('prod-ca-2021.crt') } — nunca rejectUnauthorized:false.
const client = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: true } });
await client.connect();

// dias distintos com risco ALTO, por zona (Regiao.Nome)
const diasAlto = await client.query(`
  SELECT r."Nome" AS zona, COUNT(DISTINCT DATE(s."Timestamp")) AS dias
  FROM "ScoresPerigo" s
  JOIN "Subprefeituras" sub ON sub."Id" = s."SubprefeituraId"
  JOIN "Regioes" r ON r."Id" = sub."RegiaoId"
  WHERE s."Faixa" = 2 AND s."Timestamp" >= NOW() - INTERVAL '${JANELA_DIAS} days'
  GROUP BY r."Nome"`);

// chuva acumulada estimada (ChuvaMmH * 0.25h por leitura de 15 min), por zona
const chuva = await client.query(`
  SELECT r."Nome" AS zona, COALESCE(SUM(l."ChuvaMmH") * 0.25, 0) AS mm
  FROM "LeiturasClimaticas" l
  JOIN "Subprefeituras" sub ON sub."Id" = l."SubprefeituraId"
  JOIN "Regioes" r ON r."Id" = sub."RegiaoId"
  WHERE l."Timestamp" >= NOW() - INTERVAL '${JANELA_DIAS} days'
  GROUP BY r."Nome"`);

// faixa predominante (moda) por zona
const faixaModa = await client.query(`
  SELECT zona, "Faixa" FROM (
    SELECT r."Nome" AS zona, s."Faixa",
           ROW_NUMBER() OVER (PARTITION BY r."Nome" ORDER BY COUNT(*) DESC) AS rn
    FROM "ScoresPerigo" s
    JOIN "Subprefeituras" sub ON sub."Id" = s."SubprefeituraId"
    JOIN "Regioes" r ON r."Id" = sub."RegiaoId"
    WHERE s."Timestamp" >= NOW() - INTERVAL '${JANELA_DIAS} days'
    GROUP BY r."Nome", s."Faixa"
  ) t WHERE rn = 1`);

await client.end();

const porZonaNome = {};
for (const row of diasAlto.rows) porZonaNome[row.zona] = { diasRiscoAlto: Number(row.dias) };
for (const row of chuva.rows) (porZonaNome[row.zona] ??= {}).chuvaAcumuladaMm = Math.round(Number(row.mm));
for (const row of faixaModa.rows) (porZonaNome[row.zona] ??= {}).faixaPredominante = FAIXA[row.Faixa];

// mapeia Regiao.Nome -> slug de zona
const NOME_PARA_SLUG = {
  Centro: 'zona-centro', Leste: 'zona-leste', Norte: 'zona-norte', Oeste: 'zona-oeste', Sul: 'zona-sul',
};
const zonasOut = {};
for (const [nome, slug] of Object.entries(NOME_PARA_SLUG)) {
  const s = porZonaNome[nome] ?? {};
  zonasOut[slug] = {
    diasRiscoAlto: s.diasRiscoAlto ?? 0,
    chuvaAcumuladaMm: s.chuvaAcumuladaMm ?? 0,
    faixaPredominante: s.faixaPredominante ?? 'BAIXO',
  };
}

const out = { geradoEm: new Date().toISOString().slice(0, 10), janelaDias: JANELA_DIAS, zonas: zonasOut };
const dest = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'regioes-snapshot.json');
writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');
console.log('Snapshot gerado:', dest);
