// attese-integrazione.test.ts — le attese dei test di integrazione non possono
// scendere sotto il default configurato.
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
// Un timeout PIÙ ALTO del default resta lecito: servono a flussi lenti e
// volutamente lunghi (es. i retry di auth-retry.test.tsx). Qui si vieta solo
// di scendere sotto — ed è il caso che ha prodotto il rosso.
//
// LIMITE onesto: la scansione legge i numeri scritti a mano nel testo. Un
// timeout calcolato (una variabile, un oggetto riusato) non lo vede; resta
// materia di review.

import { describe, it, expect } from 'vitest';
import setupSrc from './test-setup.ts?raw';
import vitestConfigSrc from '../vitest.config.js?raw';

const FILE = import.meta.glob('./integration/*.test.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** Toglie i commenti: qui i commenti citano `timeout: 4000` parlando del bug. */
function senzaCommenti(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

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

describe('attese dei test di integrazione', () => {
  it('la scansione copre i file di integrazione (altrimenti il test è inutile)', () => {
    // Se il glob smettesse di corrispondere, il test sotto passerebbe sempre.
    expect(Object.keys(FILE).length).toBeGreaterThanOrEqual(15);
    expect(Object.keys(FILE).some((f) => f.includes('main-flows'))).toBe(true);
  });

  it('nessuna attesa esplicita scende sotto asyncUtilTimeout', () => {
    const defaultMs = defaultAttese(setupSrc);
    const violazioni: string[] = [];
    for (const [file, src] of Object.entries(FILE)) {
      for (const m of senzaCommenti(String(src)).matchAll(/timeout:\s*(\d+)/g)) {
        if (Number(m[1]) < defaultMs) {
          violazioni.push(`${file}: timeout ${m[1]}ms < ${defaultMs}ms`);
        }
      }
    }
    expect(violazioni).toEqual([]);
  });

  it("il default delle attese resta sotto il timeout dell'intero test", () => {
    // Se `asyncUtilTimeout` raggiungesse `testTimeout`, un'attesa potrebbe
    // consumare tutto il budget del test e il fallimento diventerebbe
    // "test timeout" (messaggio che non dice cosa non è arrivato).
    expect(defaultAttese(setupSrc)).toBeLessThan(testTimeout(vitestConfigSrc));
  });
});
