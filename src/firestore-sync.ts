// firestore-sync.ts — useSyncExternalStore adapter per Firestore onSnapshot
// Sostituisce useState+useEffect(onSnapshot) con useSyncExternalStore
// per gestione sottoscrizioni gestita da React (no tearing, no stale closure)
//
// REFACTOR (bug #7): gli store sono ISTANZIATI per chiamata (closure), non più
// singleton a livello di modulo. Ogni createXxxStore possiede il proprio stato
// (snapshot, loaded, listeners, unsub) e la propria cache combinata. Il
// destroy() di un'istanza non tocca più i listener/sottoscrizioni di altre
// istanze, ed è sparita la classe di race tra store condivisi a livello di
// modulo (stesso db catturato all'import, chiavi globali, ecc.).

import { safeDocId } from './utils/format.ts';

// Accesso LAZY a window.db: letto al momento della sottoscrizione, non
// all'import. Se questo modulo viene valutato prima di app-utils/firebase-init
// (che assegnano window.db), tutte le query partirebbero con db undefined.
function getDb(): any {
  return window.db;
}

// ── STORE: CARDS ───────────────────────────────────────────────────────────
// Fase 4 (perf): filtro server-side per anno scolastico. Prima scaricavamo
// TUTTE le card di TUTTI gli anni e filtravamo solo in client (cards.ts); ora
// Firestore restituisce solo l'anno corrente → meno rete e meno re-render.
// NOTA: l'orderBy('ordine') è stato rimosso dalla query: l'ordinamento è già
// client-side (visibleSorted in cards.ts) e così evitiamo un indice composito.
// ⚠️ Richiede che TUTTE le card abbiano il campo annoScolastico: eseguire
// prima migrations/migrate-card-annoscolastico.js per le card legacy.
// onInvalidate (opzionale): chiamato quando i dati cambiano, per invalidare la
// cache combinata dell'istanza che possiede questo store (createCombinedStore).
function createCardsStore(user: any, anno: string | null, onInvalidate?: () => void) {
  var isProf = !!(user && user.role === 'prof');

  // Stato LOCALE all'istanza: due store creati con lo stesso anno/ruolo NON
  // condividono nulla — il destroy() di uno non tocca l'altro.
  var snapshot: any[] = [];
  var loaded = false;
  var listeners = new Set<() => void>();
  var unsub: (() => void) | null = null;

  function invalidate() {
    if (onInvalidate) onInvalidate();
  }
  function fire() {
    listeners.forEach(function (l) {
      l();
    });
  }

  return {
    subscribe: function (onStoreChange: () => void) {
      listeners.add(onStoreChange);
      // Una sola sottoscrizione Firestore per istanza, condivisa dai listener
      // di QUESTA istanza (mai di altre).
      if (!unsub && anno) {
        // ⚠️ Gli studenti devono filtrare in QUERY (where visibile==true): la
        // regola Firestore (cards read) ha una condizione su resource.data.visibile
        // e le regole NON sono filtri → senza il vincolo in query l'intera lettura
        // viene rifiutata con permission-denied (studente non vedeva NESSUNA card).
        // Il prof legge tutto (isProf() nella regola, query senza filtri).
        var q: any = getDb().collection('cards').where('annoScolastico', '==', anno);
        if (!isProf) q = q.where('visibile', '==', true);
        unsub = q.onSnapshot(
          function (s: any) {
            var a: any[] = [];
            s.forEach(function (d: any) {
              a.push(d.data());
            });
            snapshot = a;
            loaded = true;
            invalidate();
            fire();
          },
          function (err: any) {
            // Senza error handler un permission-denied/errore di rete lasciava
            // loaded=false per sempre → UI bloccata sullo skeleton.
            console.error('[firestore-sync] cards onSnapshot:', err && err.code, err && err.message);
            snapshot = [];
            loaded = true; // stato vuoto invece dello spinner infinito
            invalidate();
            fire();
          }
        );
      }
      return function () {
        listeners.delete(onStoreChange);
      };
    },
    getSnapshot: function () {
      return snapshot;
    },
    getLoaded: function () {
      return loaded;
    },
    destroy: function () {
      if (unsub) {
        unsub();
        unsub = null;
      }
      snapshot = [];
      loaded = false;
      listeners.clear(); // SOLO i listener di questa istanza
    },
  };
}

// ── STORE: CLASSI ──────────────────────────────────────────────────────────
function createClassiStore(anno: string | null, onInvalidate?: () => void) {
  var custom: string[] = [];
  var nascoste: string[] = [];
  var listeners = new Set<() => void>();
  var unsub: (() => void) | null = null;

  function invalidate() {
    if (onInvalidate) onInvalidate();
  }
  function fire() {
    listeners.forEach(function (l) {
      l();
    });
  }

  return {
    subscribe: function (onStoreChange: () => void) {
      listeners.add(onStoreChange);
      if (!unsub && anno) {
        unsub = getDb()
          .collection('config')
          .doc('classi_custom_' + safeDocId(anno))
          .onSnapshot(
            function (doc: any) {
              var d = doc.exists ? doc.data() : {};
              custom = d.lista || [];
              nascoste = d.nascoste || [];
              invalidate();
              fire();
            },
            function (err: any) {
              console.error('[firestore-sync] classi onSnapshot:', err && err.code, err && err.message);
              invalidate();
              fire();
            }
          );
      }
      return function () {
        listeners.delete(onStoreChange);
      };
    },
    getSnapshot: function () {
      return { custom: custom, nascoste: nascoste };
    },
    destroy: function () {
      if (unsub) {
        unsub();
        unsub = null;
      }
      custom = [];
      nascoste = [];
      listeners.clear();
    },
  };
}

// ── STORE: PREFERITI ───────────────────────────────────────────────────────
function createFavStore(uid: string | null, onInvalidate?: () => void) {
  var ids: string[] = [];
  var listeners = new Set<() => void>();
  var unsub: (() => void) | null = null;

  function invalidate() {
    if (onInvalidate) onInvalidate();
  }
  function fire() {
    listeners.forEach(function (l) {
      l();
    });
  }

  return {
    subscribe: function (onStoreChange: () => void) {
      listeners.add(onStoreChange);
      if (!unsub && uid) {
        unsub = getDb()
          .collection('preferiti')
          .doc(uid)
          .onSnapshot(
            function (doc: any) {
              ids = doc.exists && doc.data().ids ? doc.data().ids : [];
              invalidate();
              fire();
            },
            function (err: any) {
              console.error('[firestore-sync] preferiti onSnapshot:', err && err.code, err && err.message);
              invalidate();
              fire();
            }
          );
      }
      return function () {
        listeners.delete(onStoreChange);
      };
    },
    getSnapshot: function () {
      return ids;
    },
    destroy: function () {
      if (unsub) {
        unsub();
        unsub = null;
      }
      ids = [];
      listeners.clear();
    },
  };
}

// ── COMBINED STORE ─────────────────────────────────────────────────────────
function createCombinedStore(user: any, annoScolastico: string | null) {
  // Cache per getSnapshot: useSyncExternalStore chiama getSnapshot() spesso e
  // confronta con Object.is(). Se restituiamo un nuovo oggetto ogni volta,
  // React pensa sempre che lo store sia cambiato → re-render infiniti.
  // La cache appartiene a QUESTA istanza e viene invalidata dai tre store
  // figli (onInvalidate) quando i dati sottostanti cambiano.
  var cachedCombined: {
    allCards: any[];
    classiCustom: string[];
    classiNascoste: string[];
    preferiti: string[];
    loaded: boolean;
  } | null = null;

  function invalidate() {
    cachedCombined = null;
  }

  var cardsStore = createCardsStore(user, annoScolastico, invalidate);
  var classiStore = createClassiStore(annoScolastico, invalidate);
  var favStore = createFavStore(user ? user.uid : null, invalidate);

  return {
    subscribe: function (onStoreChange: () => void) {
      var u1 = cardsStore.subscribe(onStoreChange);
      var u2 = classiStore.subscribe(onStoreChange);
      var u3 = favStore.subscribe(onStoreChange);
      return function () {
        u1();
        u2();
        u3();
      };
    },
    getSnapshot: function () {
      if (!cachedCombined) {
        var classiData = classiStore.getSnapshot();
        cachedCombined = {
          allCards: cardsStore.getSnapshot(),
          classiCustom: classiData.custom,
          classiNascoste: classiData.nascoste,
          preferiti: favStore.getSnapshot(),
          loaded: cardsStore.getLoaded(),
        };
      }
      return cachedCombined;
    },
    destroy: function () {
      // Distrugge SOLO i figli di questa istanza: i listener/sottoscrizioni
      // delle altre istanze non vengono toccati (fix bug #7).
      cardsStore.destroy();
      classiStore.destroy();
      favStore.destroy();
    },
  };
}

window.__firestoreSync = {
  createCardsStore: createCardsStore,
  createClassiStore: createClassiStore,
  createFavStore: createFavStore,
  createCombinedStore: createCombinedStore,
};

export { createCombinedStore };
