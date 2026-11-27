// @ts-nocheck — legge i sorgenti dal filesystem, come `classi-criterio.test.ts`.
//
// OGNI FAN-OUT ALLA CLASSE PORTA LE ESCLUSIONI.
//
// `notifyClasse` (`notifiche-service.ts`) sa togliere dal fan-out le classi a cui il
// docente ha TOLTO la card (`classiEscluse`), e `annunciaClasse` gliele passa da
// sempre. I due fan-out dei commenti (`addCom`/`addReply` in `app-handlers.ts`) no:
// lo studente della classe esclusa riceveva «Luca ha commentato» per una card che la
// sua bacheca non gli mostra — la notifica tradiva il gesto del docente, e il
// dettaglio aperto dal link era vuoto, senza spiegazioni.
//
// Questa guardia non prova il comportamento (lo fanno `app-handlers.test.ts` e
// `notifiche-service.test.ts`): impedisce che una TERZA chiamata a `notifyClasse`
// nasca senza `classiEscluse`, che è il modo in cui il difetto è arrivato la prima
// volta — una chiamata nuova, scritta copiando quella vecchia.
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { sanitizza } from './promise-utils.ts';

/** Tutti i .ts/.tsx sotto `dir`, esclusi i test (citano la regola nei commenti). */
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

// Gli argomenti della chiamata: dal `(` di apertura alla parentesi bilanciata.
// Il conteggio, non una finestra di N caratteri: fra le due chiamate di
// addCom/addReply ci sono commenti lunghi, e una finestra fissa vedrebbe le
// esclusioni della chiamata successiva — cioè passerebbe sempre.
function argomenti(testo: string, daParen: number): string {
  var livello = 0;
  for (var i = daParen; i < testo.length; i++) {
    if (testo[i] === '(') livello++;
    else if (testo[i] === ')') {
      livello--;
      if (livello === 0) return testo.slice(daParen, i + 1);
    }
  }
  return testo.slice(daParen);
}

describe('fan-out alla classe · le esclusioni viaggiano sempre', function () {
  it('nessuna chiamata a `notifyClasse(...)` senza `classiEscluse`', function () {
    var trovate: string[] = [];
    var file = sorgenti(__dirname);
    file.forEach(function (f) {
      // `sanitizza` azzera commenti e stringhe: i commenti di questo repository
      // CITANO il codice (spiegando i bug passati) e senza questo passaggio la
      // guardia fallirebbe sulla documentazione di sé stessa.
      var testo = sanitizza(fs.readFileSync(f, 'utf8'));
      var re = /notifyClasse\s*\(/g;
      var m;
      while ((m = re.exec(testo)) !== null) {
        // La DICHIARAZIONE della funzione non è un fan-out: la sua firma nomina
        // `classiEscluse` per definizione (e il test non deve dipenderne).
        var prima = testo.slice(Math.max(0, m.index - 20), m.index);
        if (/\bfunction\s+$/.test(prima)) continue;
        var args = argomenti(testo, m.index + m[0].length - 1);
        if (args.indexOf('classiEscluse') < 0) {
          trovate.push(path.relative(__dirname, f) + ': ' + m[0].replace(/\s+/g, ' '));
        }
      }
    });
    expect(trovate, 'chiamata a notifyClasse senza classiEscluse: usa escluseDi (card-classi.ts)').toEqual([]);
    // Guardia sulla guardia: un raccoglitore rotto passerebbe su una lista vuota.
    expect(file.length).toBeGreaterThan(80);
  });
});
