// consensi-servizio.ts · ScuolaBoard · prova dell'accettazione dell'informativa
//
// ── Perché non basta localStorage ────────────────────────────────────────────
// L'accettazione della modale privacy veniva salvata SOLO in localStorage: svaniva
// cambiando browser, usando il telefono o svuotando i dati del sito. Per il GDPR
// l'accettazione è un fatto da poter dimostrare, non una preferenza locale. Quindi
// la si scrive anche in `consensi/{uid}`: un documento per utente, con l'id = uid
// (il client non può sbagliare destinatario, e le regole accettano solo il proprio).
//
// ── Cosa contiene, e cosa NON contiene ──────────────────────────────────────
// Solo tre campi: `versione` (quale testo è stato accettato), `accettato: true` e
// `ts` (quando). Nessun indirizzo IP, user agent o altro dato accessorio: per
// dimostrare il consenso bastano questi, e ogni campo in più è un dato personale
// da proteggere senza necessità.
//
// ── Le due funzioni ─────────────────────────────────────────────────────────
// `salvaConsenso` la chiama il pulsante "Ho capito, accetto" della PrivacyModal;
// `leggiConsenso` serve all'avvio per NON riproporre l'informativa a chi l'ha già
// accettata da un altro browser. Nessuna delle due lancia: un errore di Firestore
// non deve impedire l'uso dell'app, e l'accettazione locale resta valida.
//
// I campi scritti qui devono restare identici a quelli ammessi dalle regole:
// src/rules-consensi-consistency.test.ts confronta questo array con le Rules.

var COLLEZIONE = 'consensi';

// Distingue nelle prove QUALE testo è stato accettato. Alzarlo non ripropone la
// modale (la decisione "già accettato" la prende AppProvider dal localStorage):
// serve a sapere, guardando il documento, a cosa l'utente ha detto sì.
export var CONSENSO_VERSIONE = 'informativa-1';

// Tetto di tempo per la lettura all'avvio (vedi `leggiConsensoEntro`). Quattro
// secondi: sotto la soglia non cambia nulla, oltre la modale compare comunque.
// Non è un timeout "tecnico" ma la durata massima in cui l'app resta utilizzabile
// senza che l'informativa sia stata mostrata: Firestore, con la rete assente, può
// impiegare molto prima di rispondere (o rispondere dalla cache), e in quella
// finestra la bacheca è già cliccabile.
export var CONSENSO_LETTURA_MAX_MS = 4000;

/** Campi del documento: ESATTAMENTE quelli ammessi dalle Rules. */
export var CAMPI_CONSENSO = ['versione', 'accettato', 'ts'];

function riferimento(uid: any) {
  var db = (window as any).db;
  if (!db || uid == null || uid === '' || typeof db.collection !== 'function') return null;
  try {
    return db.collection(COLLEZIONE).doc(String(uid));
  } catch (e) {
    return null;
  }
}

/**
 * Registra l'accettazione. Non lancia: restituisce `{ ok }`.
 * Un `ok: false` NON blocca l'utente (l'accettazione locale vale comunque), ma
 * significa che la prova durevole manca: la si ritenta al prossimo avvio.
 */
export async function salvaConsenso(uid: any, versione?: string): Promise<{ ok: boolean }> {
  var ref = riferimento(uid);
  if (!ref) return { ok: false };
  try {
    await ref.set({
      versione: versione || CONSENSO_VERSIONE,
      accettato: true,
      ts: Date.now(),
    });
    return { ok: true };
  } catch (errore: any) {
    // Solo il codice: nessun dato dell'utente finisce nei log.
    try {
      console.warn('[ScuolaBoard] consenso non registrato su Firestore:', (errore && errore.code) || 'errore');
    } catch (e) {}
    return { ok: false };
  }
}

/** L'accettazione registrata (anche da un altro browser), oppure null. Non lancia. */
export async function leggiConsenso(uid: any): Promise<{ versione: string; ts: number } | null> {
  var ref = riferimento(uid);
  if (!ref) return null;
  try {
    var snap: any = await ref.get();
    if (!snap || !snap.exists) return null;
    var d = snap.data() || {};
    // Un documento senza `accettato: true` non è una prova: le regole lo vietano,
    // ma la lettura non deve fidarsi di ciò che trova.
    if (d.accettato !== true) return null;
    return { versione: d.versione || '', ts: d.ts || 0 };
  } catch (e) {
    return null;
  }
}

/**
 * Come `leggiConsenso`, ma con un TETTO DI TEMPO: oltre `ms` restituisce null.
 *
 * Serve perché l'esito di questa lettura decide se mostrare l'informativa, e una
 * lettura lenta non deve diventare un "consenso presunto": con la rete assente
 * Firestore può metterci molto prima di rispondere (o di rispondere dalla cache),
 * e in quella finestra la bacheca è già cliccabile senza che la modale sia mai
 * comparsa. `null` qui significa "non lo so", cioè "chiedi": è la direzione
 * sicura per il GDPR, l'unica che non trasforma un timeout in un'assenza di
 * informativa.
 *
 * Non lancia: un rifiuto della lettura vale come `null`.
 */
export function leggiConsensoEntro(uid: any, ms?: number): Promise<{ versione: string; ts: number } | null> {
  var limite = ms != null ? ms : CONSENSO_LETTURA_MAX_MS;
  return new Promise(function (resolve) {
    var chiuso = false;
    // Il timer non va mai lasciato in volo: se la lettura vince, viene azzerato.
    var timer = setTimeout(function () {
      if (chiuso) return;
      chiuso = true;
      resolve(null);
    }, limite);
    // `.then` a due argomenti: il rifiuto è gestito nella stessa catena, quindi
    // non resta nessuna promise derivata senza gestore (regola dell'exit code).
    leggiConsenso(uid).then(
      function (trovato) {
        if (chiuso) return;
        chiuso = true;
        clearTimeout(timer);
        resolve(trovato);
      },
      function () {
        if (chiuso) return;
        chiuso = true;
        clearTimeout(timer);
        resolve(null);
      }
    );
  });
}
