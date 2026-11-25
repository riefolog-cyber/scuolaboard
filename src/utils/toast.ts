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

/** Il toast da scartare per primo: il più vecchio NON annullabile (-1 = nessuno). */
function indiceDaScartare<T extends ToastMinimo>(lista: T[]): number {
  // L'ULTIMO è il toast appena accodato e non è un candidato: scartarlo
  // significherebbe far sparire il messaggio che il chiamante ha appena
  // mostrato (l'utente non lo vedrebbe mai e crederebbe di averlo visto).
  for (var i = 0; i < lista.length - 1; i++) {
    if (!lista[i].undo) return i;
  }
  // Restano solo annullabili: non esiste un toast che si possa buttare senza
  // perdere un'azione, quindi non si scarta niente (vedi `aggiungiToast`).
  return -1;
}

/**
 * Accoda un toast tagliando i più vecchi oltre `MAX_TOAST`. L'eccezione sono i
 * toast con `undo`: portano l'unica azione che annulla un'eliminazione, quindi
 * si scarta prima un toast informativo e, se sono TUTTI annullabili, non si
 * scarta niente.
 *
 * La lista può quindi superare `MAX_TOAST`, ma solo con più di MAX eliminazioni
 * in sospeso insieme: ogni voce è legata a un timer da `UNDO_ELIMINAZIONE_MS`
 * (5s), quindi la crescita è limitata da quel tempo. Il caso opposto — scartare
 * l'ultimo «↩ Annulla» per far posto a un messaggio — perdeva un'azione in modo
 * irreversibile: la card veniva cancellata e nessuno poteva più impedirlo.
 */
export function aggiungiToast<T extends ToastMinimo>(lista: T[], toast: T): T[] {
  var fuori = lista.concat([toast]);
  // `while` e non `if`: una lista già oltre il tetto (stato ripristinato,
  // test) deve tornare a MAX, non restare sopra di uno.
  while (fuori.length > MAX_TOAST) {
    var indice = indiceDaScartare(fuori);
    if (indice < 0) break;
    fuori.splice(indice, 1);
  }
  return fuori;
}
