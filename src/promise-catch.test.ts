// promise-catch.test.ts — nessuna catena di promise può restare senza gestore.
//
// Motivo di esistere: `vitest run` esce con codice 1 anche quando
// TUTTI i test passano, se durante il run c'è una unhandled
// rejection. In questo repo è successo tre volte di fila e una
// volta ha tenuto la CI rossa per un commit intero.
//
// Il difetto NON è quasi mai "manca il `.catch`": è che il
// `.catch` c'è e copre la promise sbagliata. Per questo il
// controllo legge la catena per intero (promise-utils.ts,
// conta-parentesi) invece di chiedere se `.catch(` sta a quattro
// righe di distanza: in tutti i casi reali incontrati qui quella
// risposta sarebbe stata "sì, è protetto" e il bug sarebbe
// passato.
//
// Quando scrivi codice nuovo: chiudi la catena con `.catch()`,
// oppure usala come `return x.then(…)` (la gestisce il
// chiamante), oppure — se il gestore sta più in alto — dichiara
// l'eccezione in ESCLUSIONI con il motivo.
//
// LIMITI onesti: l'analizzatore vede le catene `.then(`, non
// le promise floating nate da una chiamata nuda (es.
// `writeLista(x);` dentro un catch). Quelle restano materia di
// review e dei test di integrazione.

import { describe, it, expect } from 'vitest';
import { cercaCateneScoperte, esclusa, sanitizza, ESCLUSIONI, PROMESSE_SICURE } from './promise-utils.ts';

// I sorgenti li legge il glob di vitest: `?raw` porta il testo
// del file, che è quello che serve (il codice non deve girare,
// solo essere letto).
const MODULI = import.meta.glob('./**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** Le fonti di produzione: esclude i test, che contengono esempi di proposito. */
function sorgentiDiProduzione(): { file: string; src: string }[] {
  return Object.entries(MODULI)
    .map(([percorso, src]) => ({ file: percorso.replace(/^\.\//, ''), src: String(src) }))
    .filter((x) => !/\.test\.[tj]sx?$/.test(x.file));
}

describe('promise: nessuna catena .then( senza gestore', () => {
  it('non ci sono catene scoperte in nessun modulo di produzione', () => {
    const scoperte: string[] = [];
    for (const { file, src } of sorgentiDiProduzione()) {
      for (const c of cercaCateneScoperte(src)) {
        if (esclusa(file, c.rigaTesto)) continue;
        scoperte.push(`${file}:${c.riga}  ${c.rigaTesto}`);
      }
    }
    // Elenco vuoto = nessuna rejection può fuggire. Se qui compare
    // un file, o il gestore manca davvero, o va dichiarato in
    // PROMESSE_SICURE/ESCLUSIONI CON IL MOTIVO: è una promessa
    // che non rigetta o un file fuori ambito.
    expect(scoperte).toEqual([]);
  });

  // Senza questo, una esclusione può restare nella lista dopo che il
  // codice che la giustificava è cambiato: la lista marcisce e il
  // giorno che serve davvero non copre più nulla. Fallire qui.
  it('ogni esclusione è ancora necessaria (nessuna voce obsoleta)', () => {
    const usate = new Set<string>();
    for (const { file, src } of sorgentiDiProduzione()) {
      for (const c of cercaCateneScoperte(src)) {
        const e = esclusa(file, c.rigaTesto);
        if (e) usate.add(e.file + '|' + e.contiene);
      }
    }
    const obsolete = ESCLUSIONI.filter((e) => !usate.has(e.file + '|' + e.contiene)).map(
      (e) => `${e.file} · «${e.contiene}»`
    );
    expect(obsolete).toEqual([]);
  });

  // Se il pattern smettesse di corrispondere (o i sorgenti non
  // arrivassero), il test sopra passerebbe sempre senza
  // controllare nulla: peggio che non averlo.
  it('la scansione troverebbe davvero delle catene (non è un controllo vuoto)', () => {
    const campione = `
      db.collection('x').get().then(function (doc) { return doc; });
      db.collection('y').get().then(function (doc) { return doc; }).catch(function (e) {});
    `;
    const trovate = cercaCateneScoperte(campione);
    expect(trovate).toHaveLength(1);
    // la scoperta è la PRIMA riga (x, senza catch), non la seconda
    expect(trovate[0].riga).toBe(2);
    expect(trovate[0].rigaTesto).toContain("collection('x')");
  });

  it('i sorgenti di produzione sono effettivamente letti', () => {
    const n = sorgentiDiProduzione().length;
    expect(n).toBeGreaterThan(80);
  });
});

// ── I casi reali incontrati, fissati come regressioni ────────
// Se l'analizzatore si rompe, uno di questi deve accorgersene.
describe('promise-utils: i casi che hanno morso davvero', () => {
  it('il catch copriva la update annidata, NON il get esterno', () => {
    // Il caso di useClassi.aggiornaClasseStudente: il catch
    // visibile copriva solo la promise interna, l'esterna
    // restava scoperta.
    const src = `
      db.collection('users').doc(uid).get()
        .then(function (doc) {
          db.collection('users').doc(uid).update(patch)
            .then(function () { setStudenti([]); })
            .catch(function (e) { showToast('errore', 'err'); });
        });
    `;
    const trovate = cercaCateneScoperte(src);
    expect(trovate).toHaveLength(1);
    expect(trovate[0].riga).toBe(3); // la riga con `.then(`, non quella del get
  });

  it("catena annidata dentro un'altra: coperta solo dalla promise giusta", () => {
    // Il caso di addReply: la catena interna (notifica ai prof)
    // non era coperta dal .catch che chiudeva il get() esterno,
    // e una regex a 4 righe l'avrebbe data per protetta.
    const src = `
      get().then(function (snap) {
        inner.get().then(function (s2) { send(s2); });
      }).catch(function () {});
    `;
    expect(cercaCateneScoperte(src)).toHaveLength(1);
  });

  it('callback che avvia una promise e ritorna undefined', () => {
    // Il caso di notifyAmm: il catch del chiamante proteggeva
    // un'altra promise. La .then interna resta scoperta.
    const src = `
      var notify = function () { db.collection('u').get().then(function (s) { send(s); }); };
      salva().then(notify).catch(err);
    `;
    expect(cercaCateneScoperte(src)).toHaveLength(1);
  });

  it('try/catch più in alto NON protegge: cattura solo errori sincroni', () => {
    // È uno dei difetti reali (eseguiRinomina): il try/catch
    // sembra coprire, ma una rejection non lo attraversa.
    // Qui deve essere SEGNALATO, non ignorato.
    const src = `
      try {
        db.collection('x').get()
          .then(function (doc) { return doc; });
      } catch (e) {}
    `;
    expect(cercaCateneScoperte(src)).toHaveLength(1);
  });

  it('funzione async: il .then scoperto è comunque un rischio', () => {
    const src = `
      async function carica() {
        db.collection('x').get().then(function (doc) { return doc; });
      }
    `;
    expect(cercaCateneScoperte(src)).toHaveLength(1);
  });

  it('return della catena: la gestisce il chiamante', () => {
    const src = `
      function carica() {
        return db.collection('x').get().then(function (doc) { return doc; });
      }
    `;
    expect(cercaCateneScoperte(src)).toEqual([]);
  });

  it('then(successo, errore): il secondo argomento è il gestore', () => {
    const src = `db.get().then(function (d) { return d; }, function (e) { log(e); });`;
    expect(cercaCateneScoperte(src)).toEqual([]);
  });

  it('then(successo, nomeDiFunzione): anche un riferimento va bene', () => {
    const src = `db.get().then(onOk, onErr);`;
    expect(cercaCateneScoperte(src)).toEqual([]);
  });

  it('promise sicure per costruzione: non segnalate', () => {
    for (const nome of PROMESSE_SICURE) {
      const src = `  ${nome}({ card: c }).then(function (esito) { return esito; });`;
      expect(cercaCateneScoperte(src), nome).toEqual([]);
    }
  });

  it('i commenti che citano .then non contano come codice', () => {
    // I commenti di questo repo parlano del difetto e citano
    // `.then(`: senza rimuoverli, il test troverebbe codice
    // inesistente.
    const src = `
      // NON usare .then( senza catch: nel repo è già successo.
      db.get().then(function (d) { return d; }).catch(function () {});
    `;
    expect(cercaCateneScoperte(src)).toEqual([]);
  });

  it('i nomi di file con .then dentro una stringa non contano', () => {
    const src = `console.log("usa .then( qui dentro", 1);`;
    expect(cercaCateneScoperte(src)).toEqual([]);
  });

  it('una catena lunga con il catch in fondo è protetta', () => {
    // Il caso normale: il catch sta 8 righe sotto. Una finestra
    // di 4 righe l'avrebbe segnalata a torto.
    const src = `
      db.get()
        .then(function (a) {
          return f1(a);
        })
        .then(function (b) {
          return f2(b);
        })
        .catch(function (e) {
          log(e);
        });
    `;
    expect(cercaCateneScoperte(src)).toEqual([]);
  });

  it("l'ultimo .then di una catena con catch è protetto, ma uno dopo no", () => {
    // `.then(a).catch(c).then(b)`: il primo è coperto dal catch,
    // l'ultimo resta scoperto (il suo risultato è buttato via).
    const src = `db.get().then(a).catch(c).then(b);`;
    const trovate = cercaCateneScoperte(src);
    expect(trovate).toHaveLength(1);
    expect(trovate[0].catena).toContain('.then(b)');
  });
});

// ── Il lessico: commenti, stringhe e LETTERALI REGEX ─────────
// Sanitizzare male non fa fallire nulla: fa VEDERE MENO. Un apice dentro una
// regex (`/Card copiata nell'anno/`, vero codice in regression-fixes.test.tsx)
// apriva una finta "stringa" che si chiudeva righe dopo, e da lì in poi il file
// risultava testo: l'analizzatore smetteva di vedere le catene `.then(` di
// quel tratto senza dirlo a nessuno. Questi test tengono il lessico onesto.
describe('sanitizza: commenti, stringhe e letterali regex', () => {
  it('una regex con un apice non apre una finta stringa', () => {
    const src = "expect(screen.queryByText(/Card copiata nell'anno/)).toBeNull();";
    const s = sanitizza(src);
    // Le parentesi del CODICE restano (3 aperte, 3 chiuse)…
    expect((s.match(/\(/g) || []).length).toBe(3);
    expect((s.match(/\)/g) || []).length).toBe(3);
    expect(s).toContain('toBeNull');
    // …e il contenuto della regex è fuori dal codice.
    expect(s).not.toContain('anno');
  });

  it('una divisione non viene scambiata per una regex', () => {
    const src = 'const p = n / 2; x.get().then(function (d) { return d; });';
    expect(sanitizza(src)).toContain('.then(');
    expect(cercaCateneScoperte(src)).toHaveLength(1);
  });

  it('una regex che cita .then( non è una catena', () => {
    expect(cercaCateneScoperte('const re = /\\.then\\(/;')).toEqual([]);
  });

  it('le newline restano: i numeri di riga non si spostano', () => {
    const src = 'a\n// commento\nb\n/* blocco\nsu due righe */\nf\nconst r = /x/g;\n';
    expect(sanitizza(src).split('\n').length).toBe(src.split('\n').length);
  });
});
