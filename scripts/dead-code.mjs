// dead-code.mjs — audit di codice morto per ScuolaBoard (sola lettura).
//
// Uso: npm run deadcode   (o: node scripts/dead-code.mjs)
//
// Versione Node di quello che era scripts/dead-code.sh: gli stessi quattro scan
// euristici, più tre controlli che lo script bash non faceva (import inutilizzati,
// file orfani, funzioni mai chiamate). Vive in Node e non in bash perché `bash`
// su Windows rimanda a WSL, che quasi nessuno ha installato: con lo script bash
// `npm run deadcode` falliva su questo sistema.
//
// Heuristica, non AST: è una lista di sospetti da leggere, non un verdetto.
// I falsi positivi noti sono segnalati sotto, non nascosti.
//
//   USO: node scripts/dead-code.mjs [radice]     (default: radice del progetto)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.argv[2] || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const E2E = path.join(ROOT, 'e2e');
const TS = ['.ts', '.tsx'];

function walk(dir, exts) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, exts));
    else if (!exts || exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}

const SRC_TS = walk(SRC, TS);
const ALL_SRC = walk(SRC, null);
const E2E_FILES = walk(E2E, ['.js', '.ts', '.tsx']);
const INDEX_HTML = path.join(ROOT, 'index.html');
const NON_TEST = SRC_TS.filter((f) => !/\.(test|spec)\./.test(f));

const cache = new Map();
const read = (p) => {
  if (!cache.has(p)) cache.set(p, fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '');
  return cache.get(p);
};
// equivalente di `grep -rlm1`: i file in cui il simbolo compare almeno una volta
const filesWith = (re, files) => files.filter((f) => re.test(read(f)));
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');
const isBoundary = (name) => '(^|[^.\\w$])' + name + '(?![\\w$])';

function section(titolo) {
  console.log('\n=== ' + titolo + ' ===');
}
function report(lines, vuoto) {
  console.log(lines.length ? lines.join('\n') : '  ' + vuoto);
}

// ── 1) window.* senza consumer ──────────────────────────────────────────────
section('1) Registrazioni window.* senza consumer (escluso il file di definizione)');
{
  const simboli = new Set();
  for (const f of SRC_TS) {
    let m;
    const re = /window\.([A-Za-z_][A-Za-z0-9_]*)\s*=/g;
    while ((m = re.exec(read(f)))) simboli.add(m[1]);
  }
  const out = [];
  for (const s of simboli) {
    const def = filesWith(new RegExp('window\\.' + s + '\\s*='), ALL_SRC)[0];
    if (!def) continue;
    if (filesWith(new RegExp('\\b' + s + '\\b'), ALL_SRC).filter((f) => f !== def).length === 0) {
      out.push('  window.' + s + ' (definita in ' + path.basename(def) + ')');
    }
  }
  report(out, 'nessuna');
}

// ── 2) SB.* senza consumer ──────────────────────────────────────────────────
section('2) Registrazioni SB.* senza consumer (escluso il file di definizione)');
{
  const simboli = new Set();
  for (const f of SRC_TS) {
    let m;
    const re = /SB\.([A-Za-z_][A-Za-z0-9_]*)\s*=/g;
    while ((m = re.exec(read(f)))) simboli.add(m[1]);
  }
  const out = [];
  for (const s of simboli) {
    const def = filesWith(new RegExp('SB\\.' + s + '\\s*='), ALL_SRC)[0];
    if (!def) continue;
    if (filesWith(new RegExp('\\b' + s + '\\b'), ALL_SRC).filter((f) => f !== def).length === 0) {
      out.push('  SB.' + s + ' (definita in ' + path.basename(def) + ')');
    }
  }
  report(out, 'nessuna');
}

// ── 3) classi CSS mai usate ─────────────────────────────────────────────────
section('3) Classi CSS definite ma mai usate in src/index.html');
{
  const SKIP = /^(png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|eot|css|js|map|ico)$/;
  const classi = new Set();
  let m;
  const re = /\.([a-zA-Z_][a-zA-Z0-9_-]*)/g;
  const css = read(path.join(SRC, 'styles.css'));
  while ((m = re.exec(css))) if (!SKIP.test(m[1])) classi.add(m[1]);
  const target = [...SRC_TS, INDEX_HTML];
  const out = [];
  for (const c of classi) {
    if (filesWith(new RegExp('\\b' + c + '\\b'), target).length === 0) out.push('  .' + c);
  }
  report(out, 'nessuna');
  console.log('  [classi totali in styles.css: ' + classi.size + ']');
}

// ── 4) export mai importati ─────────────────────────────────────────────────
// NOTA (falso positivo noto): lo script bash escludeva il file di definizione
// dal conteggio, quindi un simbolo usato SOLO nel proprio file sembrava morto.
// Qui si controlla anche l'uso interno, e si segnala solo se non è usato né
// importato. Un `export` superfluo è ancora un reperto, ma innocuo.
section("4) Export mai usati né importati (nome | file)");
{
  const POOL = [...SRC_TS, ...E2E_FILES];
  const out = [];
  for (const f of SRC_TS) {
    if (/\.(test|spec)\./.test(f)) continue;
    const src = read(f);
    const simboli = new Set();
    let m;
    let re = /export\s+(?:async\s+)?(?:function|const|var|let|class)\s+([A-Za-z_][A-Za-z0-9_]*)/g;
    while ((m = re.exec(src))) simboli.add(m[1]);
    re = /export\s*\{([^}]+)\}/g;
    while ((m = re.exec(src))) {
      m[1]
        .split(',')
        .map((s) => s.trim().split(/\s+as\s+/).pop().trim())
        .filter(Boolean)
        .forEach((s) => simboli.add(s));
    }
    for (const s of simboli) {
      const usatoLocale = (src.match(new RegExp('(^|[^.\\w$])' + s + '\\b', 'g')) || []).length > 1;
      const usatoAltrove = filesWith(new RegExp(isBoundary(s)), POOL).some((o) => o !== f);
      if (!usatoLocale && !usatoAltrove) out.push('  ' + s + ' | ' + rel(f));
    }
  }
  report(out, 'nessuno');
}

// ── 5) import dichiarati e mai usati ────────────────────────────────────────
// ATTENZIONE, falsa allerta già incontrata: `Fragment` da 'react' NON va
// segnalato come morto. Il runtime JSX reale è AUTOMATICO (vite.config.js non
// imposta pragma; vitest.config.js li imposta, ma Babel li rifiuta: "pragma and
// pragmaFrag cannot be set when runtime is automatic"), quindi lo shorthand `<>`
// non usa l'import nominativo. Sembra semplice da togliere: si può, ma se un
// giorno qualcuno allinea la configurazione al runtime classic come dice
// AGENTS.md, `pragmaFrag: 'Fragment'` renderebbe quei file dipendenti dall'import
// e si romperebbero. Si lasciano stare e si segnala il disaccordo.
section('5) Import dichiarati ma mai citati nel corpo del file');
{
  const out = [];
  const sospetti = [];
  for (const f of NON_TEST) {
    const src = read(f);
    let m;
    const re = /import\s+(?:type\s+)?\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
    while ((m = re.exec(src))) {
      const da = m[2];
      const corpo = src.replace(/import\s+(?:type\s+)?\{[^}]+\}\s*from\s*['"][^'"]+['"];?/g, '');
      for (const grezzo of m[1].split(',')) {
        // NB: prima il trim, POI il prefisso `type`. In quest'ordine il nome
        // diventava "type Theme" (spazio iniziale) e il prefisso non veniva
        // tolto: il simbolo risultava inesistente e ogni import di tipo usato
        // in annotazione finiva segnalato come morto.
        const s = grezzo
          .trim()
          .split(/\s+as\s+/)
          .pop()
          .replace(/^type\s+/, '')
          .trim();
        if (!s) continue;
        if (!new RegExp(isBoundary(s)).test(corpo)) {
          const riga = '  ' + s + ' | ' + rel(f) + '  (da ' + da + ')';
          if (s === 'Fragment' && da === 'react') sospetti.push(riga + '   [LOBBEDO: vedi nota]');
          else out.push(riga);
        }
      }
    }
  }
  report(out, 'nessuno');
  report(sospetti, 'nessun sospetto');
}

// ── 6) file i cui export non sono citati da nessun'altra parte ──────────────
section('6) File senza simboli usati altrove (possibili orfani)');
{
  const out = [];
  for (const f of NON_TEST) {
    if (f.endsWith('.d.ts')) continue; // i .d.ts sono dichiarazioni: non sono importati per definizione
    const src = read(f);
    const simboli = new Set();
    let m;
    let re = /export\s+(?:async\s+)?(?:function|const|var|let|class)\s+([A-Za-z_][A-Za-z0-9_]*)/g;
    while ((m = re.exec(src))) simboli.add(m[1]);
    re = /export\s*\{([^}]+)\}/g;
    while ((m = re.exec(src))) {
      m[1]
        .split(',')
        .map((s) => s.trim().split(/\s+as\s+/).pop().trim())
        .filter(Boolean)
        .forEach((s) => simboli.add(s));
    }
    const base = path.basename(f).replace(/\.tsx?$/, '');
    const POOL = [...SRC_TS, ...E2E_FILES];
    const perNome = filesWith(new RegExp(base), POOL).some((o) => o !== f);
    const perSimbolo = [...simboli].some((s) => filesWith(new RegExp(isBoundary(s)), POOL).some((o) => o !== f));
    if (!perNome && !perSimbolo) out.push('  ' + rel(f) + '  (export: ' + ([...simboli].join(', ') || 'nessuno') + ')');
  }
  report(out, 'nessuno');
}

// ── 7) funzioni mai chiamate in locale e mai citate altrove ────────────────
section('7) Function mai chiamate in locale e mai citate in un altro file');
{
  const POOL = [...SRC_TS, ...E2E_FILES];
  const out = [];
  for (const f of NON_TEST) {
    const src = read(f);
    let m;
    const re = /^\s*(export\s+)?(?:async\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)/gm;
    while ((m = re.exec(src))) {
      const nome = m[2];
      if (nome === 'function') continue;
      const chiamate = (src.match(new RegExp('(^|[^.\\w$])' + nome + '\\s*\\(', 'g')) || []).length;
      const altrove = filesWith(new RegExp(isBoundary(nome)), POOL).some((o) => o !== f);
      if (chiamate === 0 && !altrove) out.push('  ' + nome + ' | ' + rel(f) + (m[1] ? '  (export)' : ''));
    }
  }
  report(out, 'nessuna');
  console.log('\n[file non-test analizzati: ' + NON_TEST.length + ']');
}

console.log('\nScan completato. Le voci elencate sono SOSPETTI da leggere, non sentenze.');