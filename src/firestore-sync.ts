// firestore-sync.ts — useSyncExternalStore adapter per Firestore onSnapshot
// Sostituisce useState+useEffect(onSnapshot) con useSyncExternalStore
// per gestione sottoscrizioni gestita da React (no tearing, no stale closure)

import { safeDocId } from './utils/format.ts';

// ── MODULE-LEVEL SINGLETONS ────────────────────────────────────────────────
var _cardsSnapshot: any[] = [];
var _cardsListeners = new Set<() => void>();
var _cardsUnsub: (() => void) | null = null;
// Chiave = anno + ruolo: la query degli studenti (con where visibile==true)
// è diversa da quella del prof (tutte le card) → cambiando ruolo bisogna
// ri-sottoscrivere, altrimenti lo studente erediterebbe la query del prof.
var _cardsKey: string | null = null;

var _classiCustom: string[] = [];
var _classiNascoste: string[] = [];
var _classiListeners = new Set<() => void>();
var _classiUnsub: (() => void) | null = null;
var _classiAnno: string | null = null;

var _preferiti: string[] = [];
var _preferitiListeners = new Set<() => void>();
var _preferitiUnsub: (() => void) | null = null;
var _preferitiUid: string | null = null;

// ── COMBINED SNAPSHOT CACHE ────────────────────────────────────────────────
// useSyncExternalStore chiama getSnapshot() frequentemente e confronta
// il risultato con Object.is(). Se ritorniamo un nuovo oggetto ogni volta,
// React pensa sempre che lo store sia cambiato → re-render infiniti.
// Cache: creiamo un nuovo oggetto solo quando i dati sottostanti cambiano.

var _cachedCombined: { allCards: any[]; classiCustom: string[]; classiNascoste: string[]; preferiti: string[] } | null = null;

var db = window.db;

// ── STORE: CARDS ───────────────────────────────────────────────────────────
// Fase 4 (perf): filtro server-side per anno scolastico. Prima scaricavamo
// TUTTE le card di TUTTI gli anni e filtravamo solo in client (cards.ts); ora
// Firestore restituisce solo l'anno corrente → meno rete e meno re-render.
// NOTA: l'orderBy('ordine') è stato rimosso dalla query: l'ordinamento è già
// client-side (visibleSorted in cards.ts) e così evitiamo un indice composito.
// ⚠️ Richiede che TUTTE le card abbiano il campo annoScolastico: eseguire
// prima migrations/migrate-card-annoscolastico.js per le card legacy.
function createCardsStore(user: any, anno: string | null) {
  var isProf = !!(user && user.role === 'prof');
  var key = anno + (isProf ? ':prof' : ':stud');
  return {
    subscribe: function (onStoreChange: () => void) {
      _cardsListeners.add(onStoreChange);
      // Cambio anno/ruolo → nuova sottoscrizione con il filtro giusto
      if (_cardsKey !== key) {
        if (_cardsUnsub) {
          _cardsUnsub();
          _cardsUnsub = null;
        }
        _cardsKey = key;
        _cardsSnapshot = [];
        _cachedCombined = null;
      }
      if (!_cardsUnsub && anno) {
        // ⚠️ Gli studenti devono filtrare in QUERY (where visibile==true): la
        // regola Firestore (cards read) ha una condizione su resource.data.visibile
        // e le regole NON sono filtri → senza il vincolo in query l'intera lettura
        // viene rifiutata con permission-denied (studente non vedeva NESSUNA card).
        // Il prof legge tutto (isProf() nella regola, query senza filtri).
        var q: any = db.collection('cards').where('annoScolastico', '==', anno);
        if (!isProf) q = q.where('visibile', '==', true);
        _cardsUnsub = q.onSnapshot(function (s: any) {
          var a: any[] = [];
          s.forEach(function (d: any) {
            a.push(d.data());
          });
          _cardsSnapshot = a;
          _cachedCombined = null; // invalida cache combinata
          _cardsListeners.forEach(function (l) {
            l();
          });
        });
      }
      return function () {
        _cardsListeners.delete(onStoreChange);
      };
    },
    getSnapshot: function () {
      return _cardsSnapshot;
    },
    destroy: function () {
      if (_cardsUnsub) {
        _cardsUnsub();
        _cardsUnsub = null;
      }
      _cardsSnapshot = [];
      _cardsListeners.clear(); // Fix #2
      _cachedCombined = null;
      _cardsKey = null;
    },
  };
}

// ── STORE: CLASSI ──────────────────────────────────────────────────────────
function createClassiStore(anno: string | null) {
  if (_classiAnno !== anno) {
    if (_classiUnsub) {
      _classiUnsub();
      _classiUnsub = null;
    }
    _classiAnno = anno;
    _classiCustom = [];
    _classiNascoste = [];
    _cachedCombined = null;
  }

  return {
    subscribe: function (onStoreChange: () => void) {
      _classiListeners.add(onStoreChange);
      if (!_classiUnsub && anno) {
        _classiUnsub = db
          .collection('config')
          .doc('classi_custom_' + safeDocId(anno))
          .onSnapshot(function (doc: any) {
            var d = doc.exists ? doc.data() : {};
            _classiCustom = d.lista || [];
            _classiNascoste = d.nascoste || [];
            _cachedCombined = null; // invalida cache combinata
            _classiListeners.forEach(function (l) {
              l();
            });
          });
      }
      return function () {
        _classiListeners.delete(onStoreChange);
      };
    },
    getSnapshot: function () {
      return { custom: _classiCustom, nascoste: _classiNascoste };
    },
    destroy: function () {
      if (_classiUnsub) {
        _classiUnsub();
        _classiUnsub = null;
      }
      _classiCustom = [];
      _classiNascoste = [];
      _classiListeners.clear(); // Fix #2
      _cachedCombined = null;
    },
  };
}

// ── STORE: PREFERITI ───────────────────────────────────────────────────────
function createFavStore(uid: string | null) {
  if (_preferitiUid !== uid) {
    if (_preferitiUnsub) {
      _preferitiUnsub();
      _preferitiUnsub = null;
    }
    _preferitiUid = uid;
    _preferiti = [];
    _cachedCombined = null;
  }

  return {
    subscribe: function (onStoreChange: () => void) {
      _preferitiListeners.add(onStoreChange);
      if (!_preferitiUnsub && uid) {
        _preferitiUnsub = db
          .collection('preferiti')
          .doc(uid)
          .onSnapshot(function (doc: any) {
            _preferiti = doc.exists && doc.data().ids ? doc.data().ids : [];
            _cachedCombined = null; // invalida cache combinata
            _preferitiListeners.forEach(function (l) {
              l();
            });
          });
      }
      return function () {
        _preferitiListeners.delete(onStoreChange);
      };
    },
    getSnapshot: function () {
      return _preferiti;
    },
    destroy: function () {
      if (_preferitiUnsub) {
        _preferitiUnsub();
        _preferitiUnsub = null;
      }
      _preferiti = [];
      _preferitiListeners.clear(); // Fix #2
      _cachedCombined = null;
    },
  };
}

// ── COMBINED STORE ─────────────────────────────────────────────────────────
function createCombinedStore(user: any, annoScolastico: string | null) {
  var cardsStore = createCardsStore(user, annoScolastico);
  var classiStore = createClassiStore(annoScolastico);
  var favStore = createFavStore(user ? user.uid : null);

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
    // Fix #1: getSnapshot() ritorna lo stesso oggetto cached finché i dati non cambiano
    getSnapshot: function () {
      if (!_cachedCombined) {
        var classiData = classiStore.getSnapshot();
        _cachedCombined = {
          allCards: cardsStore.getSnapshot(),
          classiCustom: classiData.custom,
          classiNascoste: classiData.nascoste,
          preferiti: favStore.getSnapshot(),
        };
      }
      return _cachedCombined;
    },
    destroy: function () {
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
