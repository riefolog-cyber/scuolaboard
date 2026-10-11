// @ts-nocheck — " scansiona il filesystem (node:fs/path), come
// no-bare-react.test.ts: fuori dal typecheck stretto (il tsconfig non carica
// @types/node per i globals __dirname/process).
//
// token-coerenti.test.ts · collegare i colori inline ai token senza cambiare
// nulla di quello che si vede.
//
// ── Il problema ──────────────────────────────────────────────────────────
// I colori scritti a mano negli stili inline sono ~1480, e i token che
// definiscono la palette sono 10. Il tema chiaro, per compensare, ha dovuto
// inventarsi 101 selettori `style*=` che agganciano l'attributo inline per
// cambiarne i valori: il tema chiaro è scritto CONTRO i colori, non con i
// colori.
//
// ── Il metodo, e perché è sicuro ─────────────────────────────────────────
// Ogni colore hardcoded che corrisponde a un token viene riscritto come
//     var(--c-danger, #f87171)
// con il valore di PRIMA come fallback. In tema scuro il risultato è
// identico: il token in `:root` vale esattamente `#f87171`. Quindi
// l'aspetto di oggi è garantito dalla stessa espressione, e il beneficio è
// che da domani il tema chiaro (o un cambio di palette) le governa senza
// toccare il componente.
//
// Questo file verifica che la garanzia sia vera: per ogni
// `var(--token, fallback)` nel codice, il fallback deve coincidere con il
// valore che il token ha in `:root`. Se qualcuno scrive un fallback diverso,
// il test va rosso: quello stile cambierebbe aspetto al buio, e nessuno
// se ne accorgerebbe guardando la bacheca.

import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { senzaCommenti, variabiliGlobali } from './css-utils.ts';

const CSS = senzaCommenti(fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8'));
const scuro = variabiliGlobali(CSS);

/** I valori di `:root` normalizzati (senza spazi): `#1a1a2e` come `--c-bg`. */
function norm(v: string): string {
  return String(v).replace(/\s+/g, '').toLowerCase();
}
const SCURO_NORM: Record<string, string> = {};
for (const k of Object.keys(scuro)) SCURO_NORM[k] = norm(scuro[k]);

/** Tutti i sorgenti di produzione (esclusi i test e i documenti). */
function sorgenti(): { file: string; testo: string }[] {
  const fuori: { file: string; testo: string }[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === 'docs') continue;
        walk(p);
      } else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) {
        fuori.push({ file: path.relative(__dirname, p), testo: senzaCommenti(fs.readFileSync(p, 'utf8')) });
      }
    }
  };
  walk(__dirname);
  return fuori;
}

/** Ogni uso `var(--token, fallback)` trovato nel codice. */
function usiConFallback(): { file: string; token: string; fallback: string; riga: number }[] {
  const fuori: { file: string; token: string; fallback: string; riga: number }[] = [];
  for (const { file, testo } of sorgenti()) {
    const righe = testo.split(/\r?\n/);
    righe.forEach((riga, i) => {
      // var(--c-danger, #f87171) — il fallback può contenere spazi (rgba).
      for (const m of riga.matchAll(/var\(\s*(--[a-z-]+)\s*,\s*([^)]+)\)/g)) {
        fuori.push({ file, token: m[1], fallback: m[2].trim(), riga: i + 1 });
      }
    });
  }
  return fuori;
}

describe('token: ogni var(--token, fallback) mantiene il colore di oggi', () => {
  const usi = usiConFallback();

  it('esiste almeno un uso di questa forma (il test non è vuoto)', () => {
    expect(usi.length).toBeGreaterThan(0);
  });

  it('il fallback coincide con il valore del token in tema scuro', () => {
    // Il caso "token inesistente" è coperto dal test qui sotto: qui si
    // controlla solo che, dove il token esiste, il fallback sia lo stesso
    // valore — è la garanzia che al buio non cambi nulla.
    const diversi = usi
      .filter((u) => u.token in SCURO_NORM && norm(u.fallback) !== SCURO_NORM[u.token])
      .map(
        (u) => `${u.file}:${u.riga} — ${u.token} in :root vale ${scuro[u.token]}, il fallback è ${u.fallback}`
      );
    expect(diversi, `fallback diversi dal token (cambierebbero il colore al buio):\n${diversi.join('\n')}`).toEqual(
      []
    );
  });

  it('nessun uso di un token inesistente (typo che passerebbe in silenzio)', () => {
    const inesistenti = usi
      .filter((u) => !(u.token in SCURO_NORM))
      .map((u) => `${u.file}:${u.riga} — ${u.token}`);
    expect(inesistenti, `token che non esistono in :root:\n${inesistenti.join('\n')}`).toEqual([]);
  });
});

describe('token: il rgb della palette non va scritto a mano', () => {
  // Esiste `--c-primary-rgb` apposta per `rgba(var(--c-primary-rgb), .3)`:
  // senza, ogni sfondo tintegggiato del primary ripete i tre numeri e il tema
  // chiaro continua a colorarli di indigo scuro su fondo bianco.
  it('nessun rgba() ripete i numeri del primary invece di usare il token', () => {
    const numeri = scuro['--c-primary-rgb'] || '';
    if (!numeri) return; // nessun token rgb: il controllo non ha senso
    const via = /rgba\(\s*99\s*,\s*102\s*,\s*241\s*,/;
    const colpevoli: string[] = [];
    for (const { file, testo } of sorgenti()) {
      testo.split(/\r?\n/).forEach((riga, i) => {
        if (via.test(riga) && !riga.includes('var(--c-primary-rgb')) {
          colpevoli.push(`${file}:${i + 1}`);
        }
      });
    }
    expect(
      colpevoli,
      `rgba() con i numeri del primary scritti a mano (usa rgba(var(--c-primary-rgb),…)):\n${colpevoli.join('\n')}`
    ).toEqual([]);
  });
});