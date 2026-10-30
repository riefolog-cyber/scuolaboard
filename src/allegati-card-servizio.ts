// allegati-card-servizio.ts · ScuolaBoard · contenuto degli allegati delle card
//
// ── Perché esiste ─────────────────────────────────────────────────────────
// Un documento Firestore è limitato a 1 MiB. Finché il contenuto dei file (data
// URL base64) stava DENTRO il documento della card, copertina + due PDF
// superavano il limite e il salvataggio veniva rifiutato ("Card troppo grande",
// caso reale da 961KB). Qui il contenuto vive in `cards/{cardId}/allegati/{fileId}`:
// un documento per file, quindi ogni allegato ha il suo MiB e la card resta
// leggera, con i soli metadati `{id, name, type, size}`.
//
// ── Cosa NON è ────────────────────────────────────────────────────────────
// Non è una difesa di sicurezza: l'allowlist degli URL (`urlAllegatoSicuro`) e la
// sandbox dell'anteprima HTML restano dove sono, perché il contenuto arriva dal
// database e va trattato come dato non fidato esattamente come prima.
//
// ── Retrocompatibilità ────────────────────────────────────────────────────
// Le card salvate prima hanno ancora `url` inline dentro `allegati`. Nessuna
// migrazione forzata: `CardDetail` usa `al.url` se c'è, altrimenti chiede qui.
// Una migrazione lazy (spostare i file quando il docente modifica la card) è
// volutamente NON implementata: una lettura non deve scrivere.

var SOTTOLETTURA = 'allegati';

// Chiavi ammesse nel documento allegato: sono le stesse di `rules firestore.txt`
// (match /cards/{cardId}/allegati/{fileId}). Se cambiano qui e non lì, Firestore
// nega la scrittura e il file non viene salvato — e il fake dei test NON applica
// le Rules, quindi la difesa è il test statico che confronta i due file.
export var CAMPI_ALLEGATO = ['name', 'type', 'size', 'url'];

// Restituisce `{ coll, motivo }`: il motivo serve al toast del docente. Prima
// questa funzione tornava solo null e il chiamante mostrava "Riprova" senza
// causa: il 25/10/2026 il rifiuto avveniva PRIMA di Firestore (lo shim compat
// non esponeva `.collection()` sui documenti) e non c'era modo di distinguerlo
// da una regola Firestore o da una rete assente.
function collezione(cardId: any): { coll: any; motivo: string } {
  var db = (window as any).db;
  if (!db || cardId == null || typeof db.collection !== 'function') {
    return { coll: null, motivo: 'Firestore non disponibile' };
  }
  // Difensivo: il mock di default di test-setup espone collection().doc() senza
  // `.collection()`. Senza questo controllo un salvataggio di card SENZA allegati
  // esploderebbe su un db che non conosce le sottocollezioni — e nei test
  // unitari il db è proprio quel mock.
  try {
    var ref = db.collection('cards').doc(String(cardId));
    if (!ref || typeof ref.collection !== 'function') {
      return { coll: null, motivo: 'client Firestore senza supporto alle sottocollezioni (ricarica la pagina)' };
    }
    return { coll: ref.collection(SOTTOLETTURA), motivo: '' };
  } catch (e) {
    return { coll: null, motivo: 'sottocollezione degli allegati non raggiungibile' };
  }
}

/**
 * Traduce l'errore di Firestore in una frase breve e senza dati personali.
 * `errore.code` è l'unica cosa stabile (i messaggi variano): `permission-denied`
 * significa regole/ruolo, `unavailable` la rete, `resource-exhausted` lo spazio.
 * Serve a distinguere la causa nel toast, non a mostrare un errore tecnico.
 */
export function motivoErrore(errore: any): string {
  var code = errore && errore.code ? String(errore.code) : '';
  switch (code) {
    case 'permission-denied':
      return 'permesso negato da Firestore (regole o ruolo)';
    case 'unauthenticated':
      return 'sessione scaduta, rifai il login';
    case 'unavailable':
    case 'deadline-exceeded':
      return 'Firestore non raggiungibile (rete assente)';
    case 'resource-exhausted':
      return 'quota Firestore esaurita';
    case 'invalid-argument':
    case 'failed-precondition':
      return 'allegato non valido per Firestore';
    case 'not-found':
      return 'card non trovata';
    default:
      return code ? 'errore Firestore (' + code + ')' : 'errore sconosciuto';
  }
}

/** Quello che resta nel documento della card: metadati, mai il contenuto. */
export function metadati(al: any) {
  return {
    id: al && al.id != null ? al.id : '',
    name: (al && (al.name || al.nome)) || '',
    type: (al && al.type) || '',
    size: (al && al.size) || 0,
  };
}

/** Campi scritti nella sottocollezione: ESATTAMENTE quelli ammessi dalle Rules. */
function documento(al: any) {
  var doc: any = {
    name: (al && (al.name || al.nome)) || '',
    type: (al && al.type) || '',
    size: (al && al.size) || 0,
    url: (al && al.url) || '',
  };
  return doc;
}

/**
 * Scrive i file nella sottocollezione e restituisce i metadati da mettere sulla
 * card. Non lancia: l'esito è esplicito perché un allegato non salvato deve poter
 * fermare il salvataggio della card (altrimenti la card elencherebbe file che non
 * esistono, e il docente li vedrebbe come righe mute per sempre).
 */
export async function salvaAllegati(
  cardId: any,
  allegati: any[] | null | undefined
): Promise<{ ok: boolean; allegati: any[]; errore?: any; motivo?: string }> {
  var lista = allegati || [];
  // Niente da salvare: si esce PRIMA di toccare il db. È il caso di ogni card
  // senza allegati (la maggioranza) e di ogni proposta dello studente: non ha
  // senso chiedere una sottocollezione che non esiste.
  if (!lista.length) return { ok: true, allegati: [] };
  var trovata = collezione(cardId);
  var coll = trovata.coll;
  if (!coll) {
    // Senza db non si può distinguere "niente da salvare" da "non salvato":
    // meglio non far credere al chiamante che sia andata bene. `motivo` è ciò
    // che il docente legge nel toast (senza, resta un "Riprova" muto).
    return { ok: false, allegati: lista.map(metadati), motivo: trovata.motivo };
  }
  // Preparazione SINCRONA di id e documento di ogni file, poi una sola tornata di
  // scritture in parallelo: i documenti sono indipendenti, quindi in serie una card
  // con 5 PDF pagava cinque volte la latenza della rete. Il documento si costruisce
  // una volta sola (`documento(al)` veniva chiamato tre volte per allegato).
  var scritture: Array<{ id: string; doc: any }> = [];
  var meta: any[] = [];
  for (var i = 0; i < lista.length; i++) {
    var al = lista[i] || {};
    var doc = documento(al);
    var id = String(al.id != null && al.id !== '' ? al.id : Date.now() + '_' + Math.random().toString(36).slice(2, 8));
    // Solo chi ha un contenuto viene scritto: le card esistenti passano di qui
    // con i metadati già letti (senza url) e non vanno riscritte.
    // Un allegato senza url e senza id non esiste da nessuna parte: si tiene lo
    // stesso comportamento (metadati, nessuna scrittura) invece di far fallire il
    // salvataggio di tutta la card; è `CardDetail` a dire "contenuto non
    // disponibile" quando la riga non si risolve, senza mentire con una ⏳ eterna.
    if (doc.url) scritture.push({ id: id, doc: doc });
    meta.push({ id: id, name: doc.name, type: doc.type, size: doc.size });
  }
  try {
    await Promise.all(
      scritture.map(function (s) {
        return coll.doc(s.id).set(s.doc);
      })
    );
    return { ok: true, allegati: meta };
  } catch (errore) {
    // Un file scritto prima del fallimento resta: è uno spazio sprecato, non un
    // errore bloccante (la card non viene salvata, quindi non lo mostra).
    return { ok: false, allegati: meta, errore: errore, motivo: motivoErrore(errore) };
  }
}

/** Contenuto degli allegati di una card. Non lancia: lista vuota se non si legge. */
export async function caricaAllegati(cardId: any): Promise<any[]> {
  var coll = collezione(cardId).coll;
  if (!coll) return [];
  try {
    var snap: any = await coll.get();
    var out: any[] = [];
    snap.forEach(function (d: any) {
      var x = d.data() || {};
      out.push({ id: d.id, name: x.name, type: x.type, size: x.size, url: x.url });
    });
    return out;
  } catch (e) {
    return [];
  }
}

/**
 * Cancella gli allegati indicati. Non lancia e non blocca: un orfano è spazio
 * sprecato, non un motivo per impedire la cancellazione di una card.
 */
export async function eliminaAllegati(cardId: any, ids: any[] | null | undefined): Promise<void> {
  var coll = collezione(cardId).coll;
  if (!coll) return;
  var lista = ids || [];
  for (var i = 0; i < lista.length; i++) {
    try {
      await coll.doc(String(lista[i])).delete();
    } catch (e) {}
  }
}

/**
 * Cancella TUTTI gli allegati di una card. Firestore non fa cascade: senza questa
 * chiamata, eliminare una card lascerebbe i file nella sottocollezione per sempre.
 */
export async function eliminaTuttiAllegati(cardId: any): Promise<void> {
  var docs = await caricaAllegati(cardId);
  await eliminaAllegati(
    cardId,
    docs.map(function (d: any) {
      return d.id;
    })
  );
}

/**
 * Copia gli allegati da una card a un'altra (duplica / copia in altro anno).
 *
 * I file si COPIANO invece di condividere il documento: condividere significherebbe
 * che cancellare una delle due card rompe l'altra, e servirebbe un conteggio dei
 * riferimenti. Il prezzo è lo spazio doppio, che è la scelta esplicita.
 */
export async function copiaAllegati(
  cardIdSorgente: any,
  cardIdDestinazione: any,
  allegatiSorgente?: any[] | null
): Promise<{ ok: boolean; allegati: any[]; errore?: any; motivo?: string }> {
  var docs = await caricaAllegati(cardIdSorgente);
  var dichiarati = allegatiSorgente || [];
  if (!docs.length) {
    // Card LEGACY: il contenuto è ancora inline nella card (nessuna migrazione
    // forzata). Copiarlo qui è l'unico modo per non perdere gli allegati
    // duplicando una card vecchia.
    var inline = dichiarati.filter(function (al: any) {
      return al && al.url;
    });
    if (inline.length) return salvaAllegati(cardIdDestinazione, inline);
    // La card dichiarava allegati ma non ne abbiamo il contenuto (lettura
    // fallita): non possiamo inventarli, quindi la copia va dichiarata parziale.
    if (dichiarati.length)
      return { ok: false, allegati: [], motivo: 'contenuto dei file non più disponibile' };
    return { ok: true, allegati: [] };
  }
  return salvaAllegati(cardIdDestinazione, docs);
}
