// undo-eliminazione.ts · ScuolaBoard · le eliminazioni revocabili (i 5s dell'undo).
//
// PERCHÉ un controllore a sé, senza React e con le dipendenze iniettate (stesso
// schema di `creaRitentativiAvvisi` in avvisi-classe.ts): prima `AppProvider`
// teneva UNA sola eliminazione in sospeso (`undoDelete`). Con due eliminazioni
// ravvicinate la seconda sovrascriveva la prima, quindi:
//
//   · "↩ Annulla" sul PRIMO toast annullava la SECONDA card;
//   · il timer della prima cancellava comunque la prima card;
//   · il messaggio «Eliminazione annullata ✓» era falso.
//
// Qui ogni eliminazione ha la sua voce, indicizzata per `toastId`: è lo stesso
// id che il toast passa al pulsante, quindi "Annulla" agisce sempre sulla sua
// card. Il timer è iniettabile, così i test lo guidano senza aspettare 5s.

/** Durata dell'undo: la card viene cancellata davvero solo alla scadenza. */
export var UNDO_ELIMINAZIONE_MS = 5000;

export function creaUndoEliminazioni(deps: {
  /** Cancellazione vera (fbDel): parte allo scadere dell'undo. */
  elimina: (_cardId: any) => void;
  /** Toglie il toast, per id: la voce non deve restare orfana sullo schermo. */
  chiudiToast: (_toastId: number) => void;
  /** L'utente ha annullato: chi chiama aggiorna lo stato e mostra il toast. */
  annullata: (_cardId: any, _toastId: number) => void;
  /** L'undo è scaduto e la card è stata cancellata. */
  eliminata: (_cardId: any, _toastId: number) => void;
  durataMs?: number;
  pianifica?: (_fn: () => void, _ms: number) => any;
  annullaTimer?: (_t: any) => void;
}) {
  var durata = deps.durataMs == null ? UNDO_ELIMINAZIONE_MS : deps.durataMs;
  var pianifica =
    deps.pianifica ||
    function (fn: () => void, ms: number) {
      return setTimeout(fn, ms);
    };
  var annullaTimer =
    deps.annullaTimer ||
    function (t: any) {
      clearTimeout(t);
    };
  var voci = new Map<number, { cardId: any; timer: any }>();

  /**
   * Avvia l'undo di una card. `toastId` è l'id del toast appena accodato:
   * ritornare `false` (id mancante o già in uso) vuol dire che qualcosa nel
   * chiamante è sbagliato, non che si può procedere lo stesso.
   */
  function avvia(cardId: any, toastId: number): boolean {
    if (toastId == null || voci.has(toastId)) return false;
    var timer = pianifica(function () {
      // Può essere stata annullata nel frattempo: il timer è già stato fermato,
      // ma la guardia evita di cancellare una card che l'utente ha tenuto.
      if (!voci.has(toastId)) return;
      voci.delete(toastId);
      deps.elimina(cardId);
      deps.chiudiToast(toastId);
      deps.eliminata(cardId, toastId);
    }, durata);
    voci.set(toastId, { cardId: cardId, timer: timer });
    return true;
  }

  /** Annulla SOLO l'eliminazione di quel toast. `false` = voce già scaduta. */
  function annulla(toastId: number): boolean {
    var voce = voci.get(toastId);
    if (!voce) return false;
    // Si toglie la voce PRIMA dei callback: se uno di loro rientra (Riprova,
    // doppio clic) non trova più niente e non annulla due volte.
    voci.delete(toastId);
    annullaTimer(voce.timer);
    deps.chiudiToast(toastId);
    deps.annullata(voce.cardId, toastId);
    return true;
  }

  return {
    avvia: avvia,
    annulla: annulla,
    /** Quante eliminazioni sono ancora annullabili (per i test e la diagnostica). */
    inCorso: function () {
      return voci.size;
    },
    /** Smontaggio del provider: nessun timer orfano, nessuna card cancellata. */
    ferma: function () {
      voci.forEach(function (voce) {
        annullaTimer(voce.timer);
      });
      voci.clear();
    },
  };
}
