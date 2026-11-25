// undo-eliminazione.test.ts — l'undo delle eliminazioni, guidato a timer finti.
//
// PERCHÉ: il bug vero era il toast sbagliato. Con un solo stato `undoDelete`
// due eliminazioni ravvicinate si sovrascrivevano, il pulsante del primo toast
// annullava la card sbagliata e la prima veniva cancellata comunque. Questi
// test fissano la regola: ogni toast annulla la SUA eliminazione.
import { describe, it, expect } from 'vitest';
import { UNDO_ELIMINAZIONE_MS, creaUndoEliminazioni } from './undo-eliminazione.ts';

function setup() {
  var pianificati: Array<{ fn: () => void; ms: number }> = [];
  var annullati: any[] = [];
  var eliminati: any[] = [];
  var chiusi: number[] = [];
  var annullate: Array<{ cardId: any; toastId: number }> = [];
  var finite: Array<{ cardId: any; toastId: number }> = [];

  var ctrl = creaUndoEliminazioni({
    elimina: function (cardId: any) {
      eliminati.push(cardId);
    },
    chiudiToast: function (toastId: number) {
      chiusi.push(toastId);
    },
    annullata: function (cardId: any, toastId: number) {
      annullate.push({ cardId: cardId, toastId: toastId });
    },
    eliminata: function (cardId: any, toastId: number) {
      finite.push({ cardId: cardId, toastId: toastId });
    },
    // Timer finti: si fanno scattare a mano, i test non aspettano 5s.
    pianifica: function (fn: () => void, ms: number) {
      pianificati.push({ fn: fn, ms: ms });
      return pianificati.length;
    },
    annullaTimer: function (t: any) {
      annullati.push(t);
    },
  });

  return { ctrl: ctrl, pianificati: pianificati, annullati: annullati, eliminati: eliminati, chiusi: chiusi, annullate: annullate, finite: finite };
}

describe('creaUndoEliminazioni', function () {
  it('programma la cancellazione con la durata dell undo', function () {
    var s = setup();
    expect(s.ctrl.avvia('c1', 7)).toBe(true);
    expect(s.pianificati).toHaveLength(1);
    expect(s.pianificati[0].ms).toBe(UNDO_ELIMINAZIONE_MS);
    expect(s.ctrl.inCorso()).toBe(1);
  });

  it('alla scadenza cancella la card e toglie il toast', function () {
    var s = setup();
    s.ctrl.avvia('c1', 7);
    s.pianificati[0].fn();
    expect(s.eliminati).toEqual(['c1']);
    expect(s.chiusi).toEqual([7]);
    expect(s.finite).toEqual([{ cardId: 'c1', toastId: 7 }]);
    expect(s.ctrl.inCorso()).toBe(0);
  });

  it('annullare ferma il timer, toglie il toast e conferma', function () {
    var s = setup();
    s.ctrl.avvia('c1', 7);
    expect(s.ctrl.annulla(7)).toBe(true);
    expect(s.annullati).toHaveLength(1); // fermato il timer della voce
    expect(s.chiusi).toEqual([7]);
    expect(s.annullate).toEqual([{ cardId: 'c1', toastId: 7 }]);
    // Un timer che scatta DOPO l'annullamento non deve cancellare niente.
    s.pianificati[0].fn();
    expect(s.eliminati).toEqual([]);
    expect(s.finite).toEqual([]);
  });

  it('due eliminazioni ravvicinate restano indipendenti (il toast sbagliato)', function () {
    var s = setup();
    s.ctrl.avvia('c1', 1);
    s.ctrl.avvia('c2', 2);
    expect(s.ctrl.inCorso()).toBe(2);

    // "Annulla" del PRIMO toast: si salva la prima card, non l'ultima.
    expect(s.ctrl.annulla(1)).toBe(true);
    expect(s.annullate).toEqual([{ cardId: 'c1', toastId: 1 }]);
    expect(s.eliminati).toEqual([]); // la seconda è ancora in sospeso

    // Alla scadenza si cancella SOLO la seconda.
    s.pianificati[1].fn();
    expect(s.eliminati).toEqual(['c2']);
    expect(s.finite).toEqual([{ cardId: 'c2', toastId: 2 }]);
    expect(s.ctrl.annulla(1)).toBe(false); // già annullata: nessun doppio effetto
  });

  it('un id sconosciuto non fa nulla', function () {
    var s = setup();
    expect(s.ctrl.annulla(99)).toBe(false);
    expect(s.chiusi).toEqual([]);
    expect(s.annullate).toEqual([]);
  });

  it('lo stesso toastId non crea due voci', function () {
    var s = setup();
    expect(s.ctrl.avvia('c1', 5)).toBe(true);
    expect(s.ctrl.avvia('c2', 5)).toBe(false);
    expect(s.ctrl.inCorso()).toBe(1);
    expect(s.pianificati).toHaveLength(1);
  });

  it('ferma (smontaggio del provider) non cancella nessuna card', function () {
    var s = setup();
    s.ctrl.avvia('c1', 1);
    s.ctrl.avvia('c2', 2);
    s.ctrl.ferma();
    expect(s.annullati).toHaveLength(2);
    expect(s.ctrl.inCorso()).toBe(0);
    // Nemmeno facendo scattare a mano i timer rimasti.
    s.pianificati[0].fn();
    s.pianificati[1].fn();
    expect(s.eliminati).toEqual([]);
  });
});
