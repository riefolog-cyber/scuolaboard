// attese-test-coerenti.test.ts — le attese dei test non possono scendere sotto
// il default configurato.
//
// `src/test-setup.ts` alza `asyncUtilTimeout` a 12s con un motivo scritto lì:
// i test di integrazione montano l'app VERA (CardDetail lazy + i moduli delle
// modali) e SOTTO COVERAGE il rendering rallenta; con il default di 1s i
// fallimenti erano sporadici in CI. Il default però si applica solo a chi non
// passa `{ timeout: N }`: un `findBy…`/`waitFor(…, { timeout: 4000 })`
// riporta l'attesa a 4s e rimette in gioco esattamente il flake che quella
// configurazione esiste per evitare.
//
// È successo davvero: `src/integration/ai-elimina-flows.test.tsx` passava
// `{ timeout: 8000 }` alle attese sulla CardDetail lazy-loaded ed è andato
// rosso in una run completa con coverage (la modale non era montata entro 8s),
// mentre lo stesso test da solo passa in ~1,6s. La correzione è stata togliere
// gli override, non alzare il timeout globale: il budget delle attese deve
// restare quello configurato in un posto solo.
//
// La regola vale per TUTTI i test di `src/`, non solo per `src/integration/`:
// anche `src/auth-access.test.tsx` e `src/auth-retry.test.tsx` montano l'app
// vera con retry e backoff.
//
// Un timeout PIÙ ALTO del default resta lecito: serve a flussi volutamente
// lenti (es. i 30s dei retry di `src/auth-retry.test.tsx`, dove il backoff dura
// ~14s). Qui si vieta solo di scendere sotto — ed è il caso che ha prodotto il
// rosso.
//
// NON è nel perimetro `vi.waitFor(…, { timeout: N })`: quello è l'API di vitest,
// che ha un suo default (1s) e non legge `asyncUtilTimeout`.
//
// LIMITE onesto: la scansione legge i numeri scritti a mano nel testo. Un
// timeout calcolato (una variabile, un oggetto riusato) non lo vede; resta
// materia di review. I test della scansione qui sotto falliscono se il parser
// smette di riconoscere le chiamate, così una regex rotta non fa passare tutto
// in silenzio.

import { describe, it, expect } from 'vitest';
import { sanitizza } from './promise-utils.ts';
import setupSrc from './test-setup.ts?raw';
import vitestConfigSrc from '../vitest.config.js?raw';

const FILE = import.meta.glob('./**/*.test.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** Il valore di `asyncUtilTimeout` configurato in src/test-setup.ts. */
function defaultAttese(src: string): number {
  const m = src.match(/asyncUtilTimeout:\s*(\d+)/);
  expect(m, 'asyncUtilTimeout non trovato in src/test-setup.ts').toBeTruthy();
  return Number(m![1]);
}

/** Il `testTimeout` di vitest.config.js: il tetto di un intero test. */
function testTimeout(src: string): number {
  const m = src.match(/testTimeout:\s*(\d+)/);
  expect(m, 'testTimeout non trovato in vitest.config.js').toBeTruthy();
  return Number(m![1]);
}

/** Indice della `)` che chiude la chiamata aperta in `p` (o -1 se non chiude). */
function fineChiamata(testo: string, p: number): number {
  // Le stringhe sono già spazi (sanitizza), quindi le parentesi contate sono
  // solo quelle del codice: resta il caso dei letterali regex, coperto dal
  // test "tutte le chiamate attesa si chiudono".
  let d = 0;
  for (let i = p; i < testo.length; i++) {
    const c = testo[i];
    if (c === '(' || c === '[' || c === '{') d++;
    else if (c === ')' || c === ']' || c === '}') {
      d--;
      if (d === 0) return i;
    }
  }
  return -1;
}

/** Numero di riga (1-based) della posizione `i` nel testo sanitizzato. */
function riga(testo: string, i: number): number {
  return testo.slice(0, i).split('\n').length;
}

type Esito = {
  violazioni: string[];
  chiamate: number;
  chiuse: number;
  timeouts: string[];
};

/** Le attese di testing-library e i `timeout` scritti nei loro argomenti. */
function analizza(file: string, src: string, min: number): Esito {
  const testo = sanitizza(src);
  const re = /((?:[A-Za-z_$][\w$]*\.)*)(waitFor|findBy[A-Za-z]*|findAllBy[A-Za-z]*)\(/g;
  const esito: Esito = { violazioni: [], chiamate: 0, chiuse: 0, timeouts: [] };
  const visti = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(testo))) {
    if (m[1] === 'vi.') continue; // API di vitest: asyncUtilTimeout non c'entra
    esito.chiamate++;
    const aperta = m.index + m[0].length - 1;
    const chiusa = fineChiamata(testo, aperta);
    if (chiusa < 0) continue;
    esito.chiuse++;
    const argomenti = testo.slice(aperta + 1, chiusa);
    for (const t of argomenti.matchAll(/timeout:\s*(\d+)/g)) {
      const n = Number(t[1]);
      const r = riga(testo, aperta + 1 + (t.index || 0));
      esito.timeouts.push(`${file}:${r} ${n}`);
      if (n < min) {
        const voce = `${file}:${r}  ${m[1]}${m[2]}(… timeout: ${n}) < ${min}`;
        if (!visti.has(voce)) {
          visti.add(voce);
          esito.violazioni.push(voce);
        }
      }
    }
  }
  return esito;
}

function analizzaTutti(min: number) {
  const esiti = Object.entries(FILE).map(([file, src]) => analizza(file.replace(/^\.\//, ''), String(src), min));
  return {
    violazioni: esiti.flatMap((e) => e.violazioni),
    chiamate: esiti.reduce((a, e) => a + e.chiamate, 0),
    chiuse: esiti.reduce((a, e) => a + e.chiuse, 0),
    timeouts: esiti.flatMap((e) => e.timeouts),
  };
}

describe('attese dei test — budget coerente', () => {
  it('la scansione copre i file di test (altrimenti il test è inutile)', () => {
    // Se il glob smettesse di corrispondere, i test sotto passerebbero sempre.
    expect(Object.keys(FILE).length).toBeGreaterThanOrEqual(60);
    expect(Object.keys(FILE).some((f) => f.includes('integration/'))).toBe(true);
    expect(Object.keys(FILE).some((f) => /^\.\/[^/]+\.test\.tsx?$/.test(f))).toBe(true);
  });

  it('nessuna attesa esplicita scende sotto asyncUtilTimeout', () => {
    const { violazioni } = analizzaTutti(defaultAttese(setupSrc));
    expect(violazioni).toEqual([]);
  });

  it('la scansione riconosce le attese e ne legge i timeout', () => {
    // Guardia sul parser: senza queste due asserzioni una regex rotta farebbe
    // passare il test principale con zero chiamate trovate.
    const { chiamate, chiuse, timeouts } = analizzaTutti(defaultAttese(setupSrc));
    expect(chiamate).toBeGreaterThan(100);
    expect(chiuse).toBe(chiamate); // nessuna chiamata troncata da una regex o un letterale
    expect(timeouts.length).toBeGreaterThanOrEqual(2); // i 30s dei retry restano
  });

  it("il default delle attese resta sotto il timeout dell'intero test", () => {
    // Se `asyncUtilTimeout` raggiungesse `testTimeout`, un'attesa potrebbe
    // consumare tutto il budget del test e il fallimento diventerebbe
    // "test timeout" (messaggio che non dice cosa non è arrivato).
    expect(defaultAttese(setupSrc)).toBeLessThan(testTimeout(vitestConfigSrc));
  });
});
