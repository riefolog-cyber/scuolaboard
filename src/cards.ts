// cards.ts — useCards hook (refactored with useSyncExternalStore)
// Sostituisce useState+useEffect(onSnapshot) con useSyncExternalStore
// per sottoscrizioni Firestore gestite nativamente da React 18.

import { useState, useEffect, useMemo, useRef, useCallback, useSyncExternalStore } from 'react';

export function useCards(user: any, annoScolastico: string) {
  // ── STORE (useSyncExternalStore) ──────────────────────────────────────
  // any: lo store è `empty` (locale) o quello di createCombinedStore (compat,
  // non tipizzato) — la superficie comune è subscribe/getSnapshot/destroy.
  var storeRef = useRef<any>(null);

  // Ricrea lo store combinato quando user o anno cambiano.
  // NIENTE destroy qui: distruggere durante il render (useMemo) è un side
  // effect illegale — con StrictMode il doppio render può distruggere lo
  // store appena creato. Il destroy del vecchio store avviene nell'effect
  // qui sotto (prevStoreRef), dove React garantisce l'ordine cleanup→setup.
  var store = useMemo(
    function () {
      if (!user) {
        // Nessun utente: store vuoto (no listener Firestore)
        // IMPORTANTE: getSnapshot deve restituire lo STESSO riferimento ogni volta
        // altrimenti useSyncExternalStore entra in loop infinito (Object.is fail).
        // [] as any[]: evita che i campi siano inferiti come never[] (trappola
        // latente quando lo store verrà tipizzato — allCards deve restare any[]).
        var emptySnap = {
          allCards: [] as any[],
          classiCustom: [] as any[],
          classiNascoste: [] as any[],
          preferiti: [] as any[],
        };
        var empty = {
          subscribe: function (_cb: any) {
            return function () {};
          },
          getSnapshot: function () {
            return emptySnap;
          },
          destroy: function () {},
        };
        storeRef.current = empty;
        return empty;
      }

      var s = window.__firestoreSync.createCombinedStore(user, annoScolastico);
      storeRef.current = s;
      return s;
    },
    [!!user, annoScolastico]
  );

  // Destroy dello store PRECEDENTE al cambio (user/anno) e all'unmount.
  // Mai durante render: il cleanup di questo effect gira prima del setup del
  // nuovo, quindi il vecchio store (prevStoreRef) viene distrutto solo dopo
  // che il nuovo è stato creato e renderizzato — niente listener appesi.
  var prevStoreRef = useRef<any>(null);
  useEffect(
    function () {
      if (prevStoreRef.current && prevStoreRef.current !== store) {
        prevStoreRef.current.destroy();
      }
      prevStoreRef.current = store;
      return function () {
        if (prevStoreRef.current) prevStoreRef.current.destroy();
      };
    },
    [store]
  );

  // ── UNICA CHIAMATA useSyncExternalStore ───────────────────────────────
  // any: lo store è non tipizzato (vedi sopra) — la superficie è
  // subscribe/getSnapshot/destroy. Stesso comportamento del vecchio UMD.
  var snap: any = useSyncExternalStore<any>(store.subscribe, store.getSnapshot);
  var rawAllCards = snap.allCards;
  var classiCustom = snap.classiCustom;
  var classiNascoste = snap.classiNascoste;
  var preferiti = snap.preferiti;

  // ── STATI LOCALI (non da Firestore) ────────────────────────────────────
  var [previewSt, setPreviewSt] = useState(false);
  var [previewClasse, setPreviewClasse] = useState('TUTTE');
  var [filterClasse, setFilterClasse] = useState('tutte');
  var [filtroBarOpen, setFiltroBarOpen] = useState(true);
  var [newCardsBanner, setNewCardsBanner] = useState([]);
  var [showBanner, setShowBanner] = useState(false);
  var [now, setNow] = useState(Date.now());
  var [view, setView] = useState('bacheca');
  var [viewStudenti, setViewStudenti] = useState(false);
  var [studenti, setStudenti] = useState([]);
  var [confirmRimuovi, setConfirmRimuovi] = useState(null);

  // ── STATI MANCANTI REINTEGRATI ──
  var [addingClasse, setAddingClasse] = useState(false);
  var [newClasseInput, setNewClasseInput] = useState('');

  // Fix #4: Local state mirrors for optimistic UI updates (sync from snapshot)
  // Gli handler in AppProvider chiamano setClassiCustom/setPreferiti/setClassiNascoste
  // per aggiornamenti ottimistici prima del roundtrip Firestore.
  // Manteniamo useState locali che vengono sincronizzati dallo snapshot.
  var [_localClassiCustom, setLocalClassiCustom] = useState(classiCustom);
  var [_localClassiNascoste, setLocalClassiNascoste] = useState(classiNascoste);
  var [_localPreferiti, setLocalPreferiti] = useState(preferiti);

  // Sync locale ← snapshot quando lo snapshot cambia (Firestore ha confermato)
  useEffect(
    function () {
      setLocalClassiCustom(classiCustom);
    },
    [classiCustom]
  );
  useEffect(
    function () {
      setLocalClassiNascoste(classiNascoste);
    },
    [classiNascoste]
  );
  useEffect(
    function () {
      setLocalPreferiti(preferiti);
    },
    [preferiti]
  );

  var nextOrd = useRef(100);
  var dragId = useRef(null);
  var seenRef = useRef(new Set());

  var isProf = user && user.role === 'prof';
  var simulaSt = isProf && previewSt;

  // Classe corrente dello studente per l'anno selezionato: fonte di verità è la
  // mappa classiPerAnno[anno] (per-anno), con fallback sul campo piatto legacy.
  var classeCorrente =
    user && user.classiPerAnno
      ? user.classiPerAnno[annoScolastico] || user.classe || null
      : user
        ? user.classe || null
        : null;

  // Inizializza seenRef da localStorage
  useEffect(function () {
    try {
      seenRef.current = SB.LS.seen.get();
    } catch (e) {}
  }, []);

  // ── NEW CARDS BANNER (studenti) ───────────────────────────────────────
  var wasEmpty = useRef(true);
  useEffect(
    function () {
      if (!user || user.role !== 'studente' || !rawAllCards.length) return;
      // Skip first load (evita banner su mount iniziale)
      if (wasEmpty.current) {
        wasEmpty.current = rawAllCards.length === 0;
        return;
      }
      wasEmpty.current = false;

      var nuove = rawAllCards.filter(function (c: any) {
        if (c.proposta || c.visibile === false) return false;
        var cc = c.classi || ['TUTTE'];
        if (cc.length === 0) return false;
        var stC = classeCorrente;
        if (stC) {
          if (cc.indexOf('TUTTE') < 0 && cc.indexOf(stC) < 0) return false;
        } else {
          if (cc.indexOf('TUTTE') < 0) return false;
        }
        return !seenRef.current.has(String(c.id));
      });
      if (nuove.length > 0) {
        setNewCardsBanner(nuove);
        setShowBanner(true);
      }
    },
    [rawAllCards, user]
  );

  // ── OPTIMISTIC UI: overlay per-card ──────────────────────────────────────
  // Manteniamo un overlay verbatim dei campi modificati in attesa della
  // conferma Firestore. La UI fonde rawAllCards + overlay; quando lo snapshot
  // del server converge ai valori ottimistici l'overlay viene rimosso (prune),
  // così un aggiornamento esterno non resta mai mascherato da un patch stale.
  var [pending, setPending] = useState<Record<string, { patch: any; fields: string[] }>>({});
  function deepEq(a: any, b: any): boolean {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch (e) {
      return a === b;
    }
  }
  var allCards = useMemo(
    function () {
      var ids = Object.keys(pending);
      if (!ids.length) return rawAllCards;
      return rawAllCards.map(function (c: any) {
        var e = pending[String(c.id)];
        return e ? Object.assign({}, c, e.patch) : c;
      });
    },
    [rawAllCards, pending]
  );
  // Prune alla convergenza: appena il server conferma i campi, togli l'overlay.
  useEffect(
    function () {
      setPending(function (prev) {
        var keys = Object.keys(prev);
        if (!keys.length) return prev;
        var next: any = {};
        var removed = false;
        keys.forEach(function (k: string) {
          var e = prev[k];
          var raw = rawAllCards.find(function (c: any) {
            return String(c.id) === k;
          });
          if (
            raw &&
            e.fields.every(function (f: string) {
              return deepEq(raw[f], e.patch[f]);
            })
          ) {
            removed = true;
          } else {
            next[k] = e;
          }
        });
        return removed ? next : prev;
      });
    },
    [rawAllCards]
  );
  function applyOptimistic(id: any, patch: any, fields: string[]) {
    setPending(function (prev) {
      return Object.assign({}, prev, { [String(id)]: { patch: patch, fields: fields } });
    });
  }
  var cardsLoaded = snap.loaded === undefined ? true : snap.loaded;

  // ── FILTRAGGIO PER ANNO SCOLASTICO (sui dati ottimistici fusion) ────────
  var cards = useMemo(
    function () {
      function annoScolasticoDefault() {
        var nowDate = new Date();
        var y = nowDate.getFullYear();
        var m = nowDate.getMonth() + 1;
        return m >= 9 ? y + '/' + (y + 1) : y - 1 + '/' + y;
      }
      return allCards.filter(function (c: any) {
        return (c.annoScolastico || annoScolasticoDefault()) === annoScolastico;
      });
    },
    [allCards, annoScolastico]
  );

  // Fix #3: allCards mantiene il dataset completo (raw, non filtrato per anno)
  // cards è il subset filtrato per annoScolastico corrente
  // allCards è calcolato sopra (overlay ottimistico su rawAllCards).

  // ── TIMER TICK ────────────────────────────────────────────────────────
  useEffect(
    function () {
      var hasScadenze = cards.some(function (c: any) {
        return c.scadenza && new Date(c.scadenza).getTime() > Date.now() - 5000;
      });
      if (!hasScadenze) return;
      var t = setInterval(function () {
        setNow(Date.now());
      }, 1000);
      return function () {
        clearInterval(t);
      };
    },
    [cards]
  );

  // ── FILTRO E ORDINAMENTO ──────────────────────────────────────────────
  var visible = useMemo(
    function () {
      return cards.filter(function (c: any) {
        if (simulaSt || !isProf) {
          if (c.proposta || c.visibile === false) return false;
          var cc = c.classi || ['TUTTE'];
          if (cc.length === 0) return false;
          var stC = simulaSt ? previewClasse : classeCorrente;
          if (!stC || stC === 'TUTTE') return cc.indexOf('TUTTE') >= 0;
          return cc.indexOf('TUTTE') >= 0 || cc.indexOf(stC) >= 0;
        }
        if (filterClasse !== 'tutte') {
          var cc2 = c.classi || [];
          if (filterClasse === '_solo') {
            if (cc2.length !== 0) return false;
          } else {
            if (cc2.indexOf('TUTTE') < 0 && cc2.indexOf(filterClasse) < 0) return false;
          }
        }
        return true;
      });
    },
    [cards, simulaSt, isProf, previewClasse, user, filterClasse]
  );

  var visibleSorted = useMemo(
    function () {
      return visible.slice().sort(function (a: any, b: any) {
        return (a.ordine || 0) - (b.ordine || 0);
      });
    },
    [visible]
  );

  // ── INTERFACE (identica a prima) ──────────────────────────────────────
  return {
    allCards: allCards,
    cards: cards,
    visible: visible,
    visibleSorted: visibleSorted,
    cardsLoaded: cardsLoaded,
    applyOptimistic: applyOptimistic,
    nextOrd: nextOrd,
    dragId: dragId,
    previewSt: previewSt,
    setPreviewSt: setPreviewSt,
    previewClasse: previewClasse,
    setPreviewClasse: setPreviewClasse,
    filterClasse: filterClasse,
    setFilterClasse: setFilterClasse,
    filtroBarOpen: filtroBarOpen,
    setFiltroBarOpen: setFiltroBarOpen,
    classiCustom: _localClassiCustom,
    setClassiCustom: setLocalClassiCustom,
    preferiti: _localPreferiti,
    setPreferiti: setLocalPreferiti,
    newCardsBanner: newCardsBanner,
    setNewCardsBanner: setNewCardsBanner,
    showBanner: showBanner,
    setShowBanner: setShowBanner,
    now: now,
    view: view,
    setView: setView,
    viewStudenti: viewStudenti,
    setViewStudenti: setViewStudenti,
    studenti: studenti,
    setStudenti: setStudenti,
    confirmRimuovi: confirmRimuovi,
    setConfirmRimuovi: setConfirmRimuovi,
    seenRef: seenRef,
    addingClasse: addingClasse,
    setAddingClasse: setAddingClasse,
    newClasseInput: newClasseInput,
    setNewClasseInput: setNewClasseInput,
    classiNascoste: _localClassiNascoste,
    setClassiNascoste: setLocalClassiNascoste,
  };
}
