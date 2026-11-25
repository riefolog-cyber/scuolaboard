// toast.ts · ScuolaBoard · identità e tetto dei toast (logica pura, senza React).
//
// PERCHÉ ESISTE: i toast si accodano da DUE punti — il hook `useToast` per i
// messaggi normali e `AppProvider` per l'undo di 5s — sullo stesso array.
//
//  · L'id era `Date.now()`: due toast mostrati nello stesso millisecondo
//    avevano lo STESSO id. React segnala chiavi duplicate e, peggio, la
//    chiusura di uno (filter per id) porta via anche l'altro.
//  · Il tetto era nel render (`slice(-5)` in Toasts.tsx): l'array cresceva
//    comunque, e un toast tagliato solo a schermo restava in memoria. Se era
//    quello con "↩ Annulla", l'utente perdeva l'unico modo per annullare
//    l'eliminazione.
//
// Qui ci sono il contatore e l'accodamento, così entrambi i punti usano la
// stessa regola invece di due copie che possono divergere.

/** Quanti toast stanno contemporaneamente sullo schermo. */
export var MAX_TOAST = 5;

var ultimoId = 0;

/**
 * Id univoco per un toast. Un contatore, non `Date.now()`: due messaggi nello
 * stesso millisecondo non devono collidere. Resta numerico perché un toast si
 * rimuove PER ID (`filter`), non per posizione.
 */
export function nuovoIdToast(): number {
  ultimoId += 1;
  return ultimoId;
}

export type ToastMinimo = { id: number; undo?: boolean };

/** Il toast da scartare per primo: il più vecchio NON annullabile. */
function indiceDaScartare<T extends ToastMinimo>(lista: T[]): number {
  for (var i = 0; i < lista.length; i++) {
    if (!lista[i].undo) return i;
  }
  // Tutti annullabili: il tetto vale comunque, si scarta il più vecchio.
  return 0;
}

/**
 * Accoda un toast tagliando i più vecchi oltre `MAX_TOAST`. L'eccezione sono i
 * toast con `undo`: portano l'unica azione che annulla un'eliminazione, quindi
 * si scarta prima un toast informativo e solo se sono TUTTI annullabili si
 * toglie il più vecchio. Il tetto protegge la memoria senza togliere azioni.
 */
export function aggiungiToast<T extends ToastMinimo>(lista: T[], toast: T): T[] {
  var fuori = lista.concat([toast]);
  // `while` e non `if`: una lista già oltre il tetto (stato ripristinato,
  // test) deve tornare a MAX, non restare sopra di uno.
  while (fuori.length > MAX_TOAST) fuori.splice(indiceDaScartare(fuori), 1);
  return fuori;
}
