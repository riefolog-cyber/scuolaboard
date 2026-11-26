// @ts-nocheck — l'ultimo blocco legge i sorgenti dal filesystem, come `classi-criterio.test.ts`.
//
// I VOTI DI UN SONDAGGIO SI LEGGONO DA UN SOLO POSTO (src/sondaggi.ts).
//
// PERCHÉ una guardia: `voti` è opzionale nel contratto e quattro punti lo
// leggevano come se fosse sempre un array di nomi. Tre esplodevano (render del
// profilo, click sul voto, analisi AI) e uno contava un votante che non esiste.
// In linea `(o.voti || [])` sembra la soluzione, ma rifà solo METÀ della regola:
// non scarta le voci sporche e non toglie i doppioni. La guardia chiude il buco
// alla radice: il campo si legge solo da `votiDi`/`totaleVoti`/`votantiDi`.
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { votiDi, haVotato, totaleVoti, votantiDi } from './sondaggi.ts';
import { sanitizza } from './promise-utils.ts';

describe('votiDi · un array di nomi, sempre', function () {
  it('opzione senza voti → lista vuota, non un errore', function () {
    expect(votiDi({ testo: 'A' })).toEqual([]);
    expect(votiDi({ testo: 'A', voti: undefined })).toEqual([]);
    expect(votiDi(null)).toEqual([]);
    expect(votiDi(undefined)).toEqual([]);
  });

  it('campo sporco (non un array) → lista vuota', function () {
    // `voti: 'Anna'` veniva da un import sbagliato: `.length` su una stringa non
    // esplode ma conta 4 caratteri, cioè un numero che nessuno può spiegare.
    expect(votiDi({ testo: 'A', voti: 'Anna' })).toEqual([]);
    expect(votiDi({ testo: 'A', voti: 3 })).toEqual([]);
    expect(votiDi({ testo: 'A', voti: { Anna: true } })).toEqual([]);
  });

  it('scarta le voci non-stringa o vuote', function () {
    expect(votiDi({ testo: 'A', voti: ['Anna', null, '', 7, 'Luca'] })).toEqual(['Anna', 'Luca']);
  });

  it('un nome ripetuto conta una volta sola (doppio tocco)', function () {
    expect(votiDi({ testo: 'A', voti: ['Anna', 'Anna', 'Luca'] })).toEqual(['Anna', 'Luca']);
  });
});

describe('haVotato · il profilo conta una card una volta sola', function () {
  it('vero solo se quel nome è fra i voti veri', function () {
    expect(haVotato({ testo: 'A', voti: ['Anna'] }, 'Anna')).toBe(true);
    expect(haVotato({ testo: 'A', voti: ['Luca'] }, 'Anna')).toBe(false);
    expect(haVotato({ testo: 'A' }, 'Anna')).toBe(false);
  });

  it('senza nome (utente non risolto) non è mai un voto', function () {
    expect(haVotato({ testo: 'A', voti: [''] }, '')).toBe(false);
    expect(haVotato({ testo: 'A', voti: ['Anna'] }, '')).toBe(false);
  });
});

describe('totaleVoti / votantiDi · le due letture della card', function () {
  it('card senza opzioni o senza voti → zero, non un crash', function () {
    expect(totaleVoti({})).toBe(0);
    expect(totaleVoti(null)).toBe(0);
    expect(totaleVoti({ opzioni: [{ testo: 'A' }, { testo: 'B' }] })).toBe(0);
    expect(votantiDi({})).toEqual([]);
    expect(votantiDi(null)).toEqual([]);
  });

  it('somma i voti veri di tutte le opzioni', function () {
    var card = {
      opzioni: [
        { testo: 'A', voti: ['Anna'] },
        { testo: 'B', voti: ['Luca', 'Sara'] },
        { testo: 'C' },
      ],
    };
    expect(totaleVoti(card)).toBe(3);
    // Il doppio tocco sulla stessa opzione non gonfia il totale (e con lui la
    // percentuale, che è calcolata su questo numero).
    expect(totaleVoti({ opzioni: [{ testo: 'A', voti: ['Anna', 'Anna'] }] })).toBe(1);
  });

  it('i votanti sono nomi distinti e non contengono buchi', function () {
    var card = {
      opzioni: [
        { testo: 'A', voti: ['Anna'] },
        { testo: 'B', voti: ['Anna', 'Luca'] },
        { testo: 'C' },
      ],
    };
    // Il vecchio `flatMap(o => o.voti)` inseriva `undefined` nell'insieme: il
    // pannello mostrava un votante in più e `join(', ')` stampava una virgola.
    expect(votantiDi(card)).toEqual(['Anna', 'Luca']);
    expect(votantiDi({ opzioni: [{ testo: 'A' }] })).toEqual([]);
  });
});

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

describe('sondaggi · il campo `voti` si legge solo da sondaggi.ts', function () {
  it('nessun accesso in linea a `.voti` fuori dal modulo', function () {
    // `sanitizza` azzera commenti, stringhe e regex: senza quel passaggio la
    // guardia fallirebbe sui commenti che CITANO il campo (e sull'attributo
    // `key="voti"` del riepilogo in CardItem).
    var AMMESSI = ['sondaggi.ts'];
    var trovate: string[] = [];
    var file = sorgenti(__dirname);
    file.forEach(function (f) {
      var rel = path.relative(__dirname, f).split(path.sep).join('/');
      if (AMMESSI.indexOf(rel) >= 0) return;
      var testo = sanitizza(fs.readFileSync(f, 'utf8'));
      var re = /\.voti\b/g;
      var m;
      while ((m = re.exec(testo)) !== null) {
        trovate.push(rel + ': ' + m[0]);
      }
    });
    expect(trovate, 'leggi i voti con votiDi/totaleVoti/votantiDi (src/sondaggi.ts)').toEqual([]);
    // Guardia sulla guardia: se il raccoglitore si rompe, il test sopra
    // passerebbe sempre su una lista vuota.
    expect(file.length).toBeGreaterThan(80);
  });
});
