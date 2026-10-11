// allegato-consegna-servizio.ts · ScuolaBoard · registra che un allegato è stato completato.
//
// Scrive su `allegati_consegne/{uid}`, un doc PER studente che mappa
// `{allegatoId: dataConsegna}`. Vedi la regola in `rules firestore.txt`.
//
// ── Perché un doc per studente e non uno per consegna ─────────────────────
// Con un doc per consegna lo studente potrebbe scrivere la consegna di un
// compagno (basta sapere il suo id) e i doc si moltiplicano. Con il doc per
// studente l'id È l'uid: la regola può richiedere `request.auth.uid == uid` e il
// problema sparisce da solo. Il costo è che l'elenco cresce sulla stessa
// persona, ed è il prezzo giusto da pagare.
//
// ── Cosa NON finisce qui ──────────────────────────────────────────────────
// Niente punteggio, niente risposte, niente esito valutato. Il messaggio che
// arriva dal file è dichiarazione dello studente e il canale è falsificabile
// (vedi allegato-consegna.ts): qui si annota solo che l'allegato è stato
// completato, per non riproporlo. Se un domani servisse contare i quiz di un
// allegato, questo numero non direbbe niente e andrebbe rifatto sul serio.

var FIRESTORE_RACCOGLIE = 'allegati_consegne';

/**
 * Registra che questo studente ha completato l'allegato.
 *
 * `chiave` deve identificare l'allegato in modo stabile (vedi `chiaveAllegato`).
 * La scrittura è "merge" su una mappa: due allegati della stessa card non si
 * sovrascrivono, e riaprire la card non perde le consegne precedenti.
 *
 * Non rifiuta mai: il chiamante non deve restare appeso, e una consegna non
 * registrata è un inconvenience, non un errore che ferma l'app.
 */
export async function registraConsegna(uid: string, chiave: string, quando?: string): Promise<void> {
  try {
    var db = (window as any).db;
    if (!db || !uid || !chiave) return;
    var ts = quando || new Date().toISOString();
    // `aggiornato` non è decorazione: la regola di create lo pretende fra le
    // chiavi ammesse (vedi rules firestore.txt, match /allegati_consegne/{uid}).
    // Senza, Firestore nega la scrittura e la consegna non viene registrata —
    // un test che guardava solo "è stato scritto qualcosa" non se ne sarebbe
    // accorto, perché il fake non applica le Rules.
    await db
      .collection(FIRESTORE_RACCOGLIE)
      .doc(uid)
      .set({ consegne: { [chiave]: ts }, aggiornato: ts }, { merge: true });
  } catch (e: any) {
    // Non blocca: l'allegato resta aperto e l'ho visto. Un errore qui non deve
    // far fallire l'interazione; la notifica resta comunque non bloccante.
    if ((window as any).SB_DEBUG) console.warn('[ScuolaBoard] consegna allegato non registrata:', e && e.code);
  }
}

/** L'elenco delle consegne dello studente, o `{}` se non ha mai consegnato. */
export async function leggiConsegne(uid: string): Promise<Record<string, string>> {
  try {
    var db = (window as any).db;
    if (!db || !uid) return {};
    var snap = await db.collection(FIRESTORE_RACCOGLIE).doc(uid).get();
    var d = snap && snap.exists ? snap.data() : null;
    return d && d.consegne && typeof d.consegne === 'object' ? d.consegne : {};
  } catch (e: any) {
    return {};
  }
}

/** Questo studente ha già completato quell'allegato? */
export function giaCompletato(consegne: Record<string, string>, chiave: string): boolean {
  return !!(consegne && chiave && consegne[chiave]);
}

/**
 * Chiave stabile per un allegato: due card non devono poter condividere la
 * stessa consegna, e lo stesso allegato aperto due volte deve coincidere.
 * Usa l'id della card più l'id (o indice) dell'allegato.
 */
export function chiaveAllegato(cardId: any, indiceAllegato: any): string {
  return String(cardId) + '_' + String(indiceAllegato);
}