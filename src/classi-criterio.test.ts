// @ts-nocheck — legge i sorgenti dal filesystem, come `token-usi.test.ts`.
//
// LA VISIBILITÀ PER CLASSE HA UN SOLO CRITERIO: `visibileAClasse` (card-classi.ts).
//
// PERCHÉ una guardia: il criterio duplicato si è ripresentato TRE volte in un solo
// giro di review — il cloud del docente, l'analisi AI per classe e il raggruppamento
// "suddivisa" — e ogni volta sbagliava in silenzio, perché `(card.classi || []).indexOf(cl)`,
// che "sembra giusto", ignora le due cose che il modulo conosce: il segnaposto TUTTE
// (una card per tutti non entra in nessuna classe) e le esclusioni (`classiEscluse`:
// una card tolta alla 3A continua a contare come 3A). Nessun tipo lo segnala, nessun
// test funzionale lo vede: si vede solo qui.
//
// Il pattern è volutamente STRETTO: cerca la copia esatta del criterio, cioè una
// `(qualcosa.classi || []).indexOf(…)` / `.includes(…)`. Un uso di `card.classi` per
// MOSTRARE i nomi delle classi (CardGrid, CardDetail) non è un criterio e non viene
// segnalato. Chi ha bisogno del confronto con un nome LETTERALE — la rinomina di una
// classe, che deve seguire il dato scritto e non la visibilità — non usa questa forma.
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { sanitizza } from './promise-utils.ts';

/** Tutti i .ts/.tsx sotto `dir`, esclusi i test (citano il pattern nei commenti). */
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

describe('visibilità per classe · un criterio solo', function () {
  it('nessun `(x.classi || []).indexOf/includes` usato come criterio', function () {
    var trovate: string[] = [];
    var file = sorgenti(__dirname);
    file.forEach(function (f) {
      // `sanitizza` azzera commenti, stringhe e regex (i commenti qui CITANO il
      // pattern vietato, spiegando il perché: senza questo passaggio la guardia
      // fallirebbe sulla documentazione di sé stessa).
      var testo = sanitizza(fs.readFileSync(f, 'utf8'));
      var re = /\([A-Za-z_$][\w$]*\.classi\s*\|\|\s*\[\]\)\s*\.\s*(?:indexOf|includes)\s*\(/g;
      var m;
      while ((m = re.exec(testo)) !== null) {
        trovate.push(path.relative(__dirname, f) + ': ' + m[0].replace(/\s+/g, ' '));
      }
    });
    expect(trovate, 'criterio di visibilità duplicato: usa visibileAClasse (card-classi.ts)').toEqual([]);
    // Guardia sulla guardia: se il raccoglitore si rompe, il test sopra passerebbe
    // sempre su una lista vuota.
    expect(file.length).toBeGreaterThan(80);
  });
});
