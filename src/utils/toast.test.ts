// toast.test.ts — identità e tetto dei toast (logica pura, senza React).
//
// PERCHÉ: gli id erano `Date.now()` (due toast nello stesso millisecondo
// collidevano) e il tetto stava nel render (`slice(-5)`), quindi l'array
// cresceva comunque e un toast con "Annulla" poteva sparire dallo schermo
// restando in memoria: l'eliminazione diventava non annullabile. Qui si
// congela la regola giusta (id univoci, tetto nell'accodamento).
import { describe, it, expect } from 'vitest';
import { MAX_TOAST, aggiungiToast, nuovoIdToast } from './toast.ts';

type T = { id: number; msg: string; type: string; undo?: boolean };

function t(id: number, undo?: boolean): T {
  return { id: id, msg: 'm' + id, type: 'ok', undo: undo };
}

function ids(lista: T[]): number[] {
  return lista.map(function (x) {
    return x.id;
  });
}

describe('nuovoIdToast', function () {
  it('gli id sono univoci anche nello stesso millisecondo', function () {
    var a = nuovoIdToast();
    var b = nuovoIdToast();
    expect(a).not.toBe(b);
    expect(b).toBeGreaterThan(a);
    // Il caso vero: tre toast accodati nello stesso tick (errore + conferma).
    var ravvicinati = [nuovoIdToast(), nuovoIdToast(), nuovoIdToast()];
    expect(new Set(ravvicinati).size).toBe(3);
  });
});

describe('aggiungiToast', function () {
  it('accoda in fondo e non muta l array ricevuto', function () {
    var lista = [t(1), t(2)];
    expect(ids(aggiungiToast(lista, t(3)))).toEqual([1, 2, 3]);
    // React può riusare l'array del render precedente: mutarlo sarebbe un bug.
    expect(ids(lista)).toEqual([1, 2]);
  });

  it('oltre il tetto scarta il più vecchio NON annullabile', function () {
    var lista = [t(1), t(2), t(3, true), t(4), t(5)];
    var fuori = aggiungiToast(lista, t(6));
    expect(fuori).toHaveLength(MAX_TOAST);
    expect(ids(fuori)).toEqual([2, 3, 4, 5, 6]);
  });

  it('non scarta MAI un toast annullabile, nemmeno oltre il tetto', function () {
    // Con più di MAX eliminazioni in sospeso insieme non c'è niente da buttare
    // senza perdere un'azione: la lista supera il tetto, e ogni voce muore
    // comunque entro i 5s dell'undo. Prima qui si scartava il più vecchio, e
    // quella card veniva cancellata senza che nessuno potesse più impedirlo.
    var lista = [t(1, true), t(2, true), t(3, true), t(4, true), t(5, true)];
    var fuori = aggiungiToast(lista, t(6, true));
    expect(fuori).toHaveLength(MAX_TOAST + 1);
    expect(ids(fuori)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('il messaggio appena accodato non si scarta mai', function () {
    // Anche a lista piena di undo: scartarlo farebbe sparire il messaggio appena
    // mostrato, e chi lo ha chiesto crederebbe di averlo visto.
    var lista = [t(1, true), t(2, true), t(3, true), t(4, true), t(5, true), t(6, true)];
    var fuori = aggiungiToast(lista, t(7));
    expect(ids(fuori)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('un toast informativo paga il posto al nuovo annullabile', function () {
    // Caso reale: una eliminazione in sospeso, poi tre messaggi e un'altra
    // eliminazione. Non si deve perdere il primo "↩ Annulla".
    var lista = [t(1, true), t(2), t(3), t(4), t(5)];
    var fuori = aggiungiToast(lista, t(6, true));
    expect(ids(fuori)).toEqual([1, 3, 4, 5, 6]);
  });

  it('una lista già oltre il tetto torna a MAX con un solo toast', function () {
    var lista = [t(1), t(2), t(3), t(4), t(5), t(6), t(7)];
    var fuori = aggiungiToast(lista, t(8));
    expect(fuori).toHaveLength(MAX_TOAST);
    expect(ids(fuori)[MAX_TOAST - 1]).toBe(8);
  });
});
