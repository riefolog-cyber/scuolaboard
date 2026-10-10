// test-budget.mjs — quanto margine ha ogni test, sotto carico, rispetto al suo budget.
//
// Perché esiste: i flake di questa suite non sono casuali, sono test che
// consumano quasi tutto il proprio budget (il `testTimeout` sull'intero test).
// Due casi reali: `ai-elimina-flows` cadeva con un'attesa di 8s sulla
// CardDetail lazy-loaded, e i due test di auth col backoff deterministico da
// ~14,3s avevano 0,7s di margine sui 15s globali. In entrambi i casi il
// fallimento arrivava su un runner carico, e il messaggio ("test timeout")
// non diceva cosa non era arrivato. Qui la domanda diventa misurabile:
// quanto consuma ogni test, in percentuale del suo budget?
//
// Come: la suite gira con il reporter JSON di vitest (che riporta la durata di
// ogni test) MENTRE dei processi bruciano CPU (`--carico`, default metà dei
// core), perché è sotto contesa che i margini stretti si vedono. Il budget di
// ogni test è quello scritto nella sua `it(...)` se c'è (`{ timeout: N }`),
// altrimenti il `testTimeout` di vitest.config.js. Oltre l'80% è un avviso;
// al 100% il test è rosso.
//
// Uso:
//   node scripts/test-budget.mjs                 # carico = metà dei core, con coverage
//   node scripts/test-budget.mjs --carico=20     # carico più duro
//   node scripts/test-budget.mjs --senza-coverage
//   node scripts/test-budget.mjs --soglia=0.6    # avviso da 60% invece che da 80%
//
// Esce con 1 se un test consuma il 100% del budget (o se la suite fallisce per
// un altro motivo): è un cruscotto, non un test, e non va messo in CI come gate.

import { spawn } from 'child_process';
import { readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import os from 'os';

const AVVISO = 0.8; // soglia di default: oltre l'80% del budget è un avviso
const arg = (nome, def) => {
  const trovato = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return trovato ? trovato.split('=')[1] : def;
};

const carico = Number(arg('carico', Math.max(2, Math.round(os.cpus().length / 2))));
const soglia = Number(arg('soglia', AVVISO));
const filtro = arg('file', null); // utile per misurare un solo file
// Tutto ciò che sta dopo `--` viene passato a vitest (es. `-- --testTimeout=150`
// per provare il comportamento quando un budget salta).
const passthrough = (() => {
  const i = process.argv.indexOf('--');
  return i >= 0 ? process.argv.slice(i + 1) : [];
})();
const conCoverage = !process.argv.includes('--senza-coverage');
const fileJson = join(tmpdir(), `sb-budget-${Date.now()}.json`);

// ── Budget di ogni test: `{ timeout: N }` nella sua it/test/describe ─────────
function budgetDaiSorgenti(testo) {
  const mappa = new Map();
  const re = /(it|test|describe)\s*\(\s*(['"`])((?:\\.|(?!\2)[\s\S])*?)\2\s*,\s*\{\s*timeout:\s*(\d+)/g;
  let m;
  while ((m = re.exec(testo))) mappa.set(m[3], Number(m[4]));
  return mappa;
}

function testTimeoutGlobale() {
  // Un `--testTimeout=` passato a vitest dopo `--` vince sulla configurazione:
  // il budget di riferimento deve essere quello che la run ha usato davvero.
  const daCli = passthrough.find((a) => a.startsWith('--testTimeout='));
  if (daCli) return Number(daCli.split('=')[1]);
  const cfg = readFileSync('vitest.config.js', 'utf8');
  const m = cfg.match(/testTimeout:\s*(\d+)/);
  if (!m) throw new Error('testTimeout non trovato in vitest.config.js');
  return Number(m[1]);
}

// ── Carico artificiale: N processi che bruciano CPU e si spengono da soli ────
function accendiCarico(n, durataMs) {
  const procs = [];
  for (let i = 0; i < n; i++) {
    procs.push(
      spawn(process.execPath, ['-e', `const fine = Date.now() + ${durataMs}; while (Date.now() < fine) {}`], {
        stdio: 'ignore',
      })
    );
  }
  return procs;
}
const spegni = (procs) => procs.forEach((p) => p.kill());

// ── La suite, con il reporter JSON (durata per test) ────────────────────────
function eseguiSuite() {
  // Il binario di vitest si invoca con `node`, non con npx: niente shell (su
  // Windows `spawn('npx', …, {shell:true})` concatena gli argomenti senza
  // quotarli) e niente overhead di risoluzione.
  const pkg = JSON.parse(readFileSync('node_modules/vitest/package.json', 'utf8'));
  const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin.vitest;
  const args = [
    join('node_modules', 'vitest', bin),
    'run',
    // Due reporter: il JSON per le durate, il default per il messaggio umano
    // (vitest 4 non mette il "Test timed out in Nms" nel JSON, solo lo stack).
    '--reporter=default',
    '--reporter=json',
    `--outputFile=${fileJson}`,
  ];
  if (conCoverage) args.push('--coverage', '--coverage.reporter=text-summary');
  if (filtro) args.push(filtro);
  args.push(...passthrough);
  return new Promise((resolve) => {
    const p = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => resolve({ code, out, err }));
  });
}

const inizio = Date.now();
let bruciatori = [];
let uccisi = false;
const pulisci = () => {
  if (!uccisi) {
    uccisi = true;
    spegni(bruciatori);
  }
};
process.on('SIGINT', () => {
  pulisci();
  process.exit(130);
});

bruciatori = accendiCarico(carico, 20 * 60 * 1000);
let esito;
try {
  console.log(
    `▸ suite con ${carico} processi di carico (${os.cpus().length} core logici)${conCoverage ? ', con coverage' : ''}…`
  );
  esito = await eseguiSuite();
} finally {
  pulisci();
}
const durataSuite = ((Date.now() - inizio) / 1000).toFixed(1);

let grezzo = null;
try {
  grezzo = readFileSync(fileJson, 'utf8');
} catch (e) {
  grezzo = null;
}
rmSync(fileJson, { force: true });

let report;
try {
  report = JSON.parse(grezzo);
} catch (e) {
  console.error('✖ Il reporter JSON non ha prodotto nulla: la suite non è arrivata in fondo.');
  console.error(esito.err.split('\n').filter(Boolean).slice(-12).join('\n'));
  process.exit(1);
}

// ── Analisi ─────────────────────────────────────────────────────────────────
const globale = testTimeoutGlobale();
const cache = new Map(); // file → mappa titolo → budget
const righe = [];
for (const file of report.testResults || []) {
  const percorso = String(file.name);
  if (!cache.has(percorso)) {
    cache.set(percorso, budgetDaiSorgenti(readFileSync(percorso, 'utf8')));
  }
  const budgetFile = cache.get(percorso);
  for (const t of file.assertionResults || []) {
    const budget = budgetFile.get(t.title) || globale;
    const durata = t.duration || 0;
    righe.push({
      file: percorso.split(/[\\/]/).slice(-1)[0],
      titolo: t.title,
      durata,
      budget,
      quota: durata / budget,
      stato: t.status,
    });
  }
}
righe.sort((a, b) => b.quota - a.quota || b.durata - a.durata);

const oltre = righe.filter((r) => r.quota > soglia);
const sforati = righe.filter((r) => r.quota >= 1);
const ms = (n) => `${(n / 1000).toFixed(2)}s`;
const pct = (n) => `${(n * 100).toFixed(0)}%`;

console.log(`\n▸ ${righe.length} test in ${durataSuite}s (budget per test: il suo, o ${globale}ms)`);
console.log(`▸ suite uscita con codice ${esito.code}`);

console.log(`\n── OLTRE IL ${pct(soglia)} DEL BUDGET (${oltre.length}) ──`);
for (const r of oltre.slice(0, 25)) {
  console.log(
    `  ${pct(r.quota).padStart(4)}  ${ms(r.durata).padStart(7)} / ${ms(r.budget).padStart(7)}  ${r.file} › ${r.titolo.slice(0, 70)}`
  );
  // Nel JSON di vitest 4 un timeout è solo "Error: STACK_TRACE_ERROR" più lo
  // stack: il testo umano ("Test timed out in 15000ms") non c'è. Quindi la
  // diagnosi qui è dedotta dal dato che c'è: durata ≥ budget ⇒ è il budget del
  // test che è scattato, non un assert.
  if (r.quota >= 1) console.log(`        ↳ la durata raggiunge il budget: è il "test timeout", non un assert`);
}
if (!oltre.length) console.log('  nessuno: nessun test si avvicina al proprio budget');

console.log(`\n── I 8 PIÙ CARICHI (anche sotto soglia) ──`);
for (const r of righe.slice(0, 8)) {
  console.log(
    `  ${pct(r.quota).padStart(4)}  ${ms(r.durata).padStart(7)} / ${ms(r.budget).padStart(7)}  ${r.file} › ${r.titolo.slice(0, 70)}`
  );
}

if (sforati.length || esito.code !== 0) {
  console.log(`\n✖ ${sforati.length} test al 100% del budget · la suite è uscita con ${esito.code}`);
  // Il perché sta nell'output umano del reporter default (il JSON non lo porta).
  // Il blocco "Failed Tests" è quello che dice COSA è mancato; se non c'è,
  // almeno la coda dello stream.
  const righeOut = esito.out.split('\n');
  const inizioGuasti = righeOut.findIndex((l) => /Failed Tests/.test(l));
  const coda = (inizioGuasti >= 0 ? righeOut.slice(inizioGuasti, inizioGuasti + 45) : righeOut.slice(-14))
    .join('\n')
    .trim();
  if (coda) console.log('\n-- da vitest --\n' + coda);
  process.exit(1);
}
console.log('\n✓ nessun test consuma il proprio budget');
