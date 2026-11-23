// @ts-nocheck — legge i sorgenti dal filesystem (node:fs/path), come
// `css-coerenti.test.ts` e `contrasto-token.test.ts`.
//
// OGNI `var(--sb-…)` USATO DEVE ESISTERE IN `:root`.
//
// PERCHÉ: un refuso (`var(--sb-lines)`) non produce nessun errore. Il CSS ignora
// la dichiarazione e il testo ricade sul colore ereditato — spesso nero su fondo
// scuro, o bianco su bianco nel tema chiaro — e nessuno dei test attuali se ne
// accorge: `contrasto-token` guarda i token che esistono, non quelli che il
// codice chiede. Questo test chiude quella classe di errore (silenziosa per
// definizione) in millisecondi.
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { SELETTORE_TEMA_CHIARO, senzaCommenti, variabiliGlobali, variabiliIn } from './css-utils.ts';

const CSS = senzaCommenti(fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8'));
// Anche i `--c-*` contano: un refuso in `var(--c-bg)` ha lo stesso effetto
// silenzioso di uno in `var(--sb-…)`. I token definiti solo nel tema chiaro
// valgono comunque (il fallback di :root non copre quei casi).
const DEFINITI = new Set(
  Object.keys(Object.assign({}, variabiliGlobali(CSS), variabiliIn(SELETTORE_TEMA_CHIARO, CSS)))
);

/** Tutti i .ts/.tsx sotto `dir`, esclusi i test (citano i token nei commenti). */
function sorgenti(dir: string, accumulati: string[] = []): string[] {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
    var p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules') return;
      sorgenti(p, accumulati);
      return;
    }
    if (!/\.(ts|tsx)$/.test(e.name) || /\.test\.(ts|tsx)$/.test(e.name)) return;
    accumulati.push(p);
  });
  return accumulati;
}

describe('token CSS · i riferimenti esistono', function () {
  it('nessun var(--sb-…/--c-…) inventato nei sorgenti', function () {
    var usati: Record<string, string> = {};
    sorgenti(__dirname).forEach(function (f) {
      var testo = fs.readFileSync(f, 'utf8');
      // Il file stesso è escluso (è un .test), quindi questo pattern non si conta.
      var re = /var\((--(?:sb|c)-[a-z0-9-]+)/g;
      var m;
      while ((m = re.exec(testo)) !== null) {
        if (!usati[m[1]]) usati[m[1]] = path.basename(f);
      }
    });

    var ignoti = Object.keys(usati).filter(function (n) {
      return !DEFINITI.has(n);
    });
    var dettaglio = ignoti.map(function (n) {
      return n + ' (' + usati[n] + ')';
    });
    expect(dettaglio, 'token usati ma non definiti in :root: ' + dettaglio.join(', ')).toEqual([]);

    // Guardia sulla guardia: se il raccoglitore si rompe, il test sopra
    // passerebbe sempre su una lista vuota.
    expect(Object.keys(usati).length, 'nessun token raccolto: la scansione è rotta').toBeGreaterThan(10);
  });
});
