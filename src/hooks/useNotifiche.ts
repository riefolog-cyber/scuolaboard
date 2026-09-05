// useNotifiche.ts · ScuolaBoard · hook notifiche in-app (solo app aperta)
// Pattern analogo a useAmmonizioni.ts / preferiti store.
// Collezione: notifiche/{uid} doc { lista: Notification[], aggiornato: ISO }
import { useState, useEffect, useCallback, useMemo } from 'react';

function getDbN() {
  return typeof window !== 'undefined' ? (window as any).db : null;
}

type Notifica = {
  id: string;
  tipo: 'nuova_card' | 'proposta_esito' | 'risposta' | 'ammonizione';
  cardId: string;
  cmId?: string;
  titolo: string;
  msg: string;
  createdAt: string;
  letta: boolean;
  annoScolastico?: string;
};

function useNotifiche(deps: { user: any }) {
  var user = deps.user;
  var [lista, setLista] = useState<Notifica[]>([]);

  useEffect(
    function () {
      var db = getDbN();
      if (!user || !user.uid || !db) {
        setLista([]);
        return;
      }
      var unsub = db
        .collection('notifiche')
        .doc(user.uid)
        .onSnapshot(
          function (doc: any) {
            if (doc.exists) setLista((doc.data().lista || []) as Notifica[]);
            else setLista([]);
          },
          function (err: any) {
            if (typeof window !== 'undefined' && (window as any).SB_DEBUG)
              console.warn('[notifiche] onSnapshot', err && err.code);
          }
        );
      return function () {
        if (unsub) unsub();
      };
    },
    [user && user.uid]
  );

  var nonLette = useMemo(
    function () {
      return lista.filter(function (n) {
        return !n.letta;
      }).length;
    },
    [lista]
  );

  // Scrive { lista: next, aggiornato } sul doc dell'utente (via diretta /
  // fallback quando la lettura fresca fallisce).
  var writeLista = useCallback(
    function (next: Notifica[]) {
      if (!user || !user.uid) return;
      var db = getDbN();
      if (!db) return;
      return db
        .collection('notifiche')
        .doc(user.uid)
        .set({ lista: next, aggiornato: new Date().toISOString() }, { merge: true });
    },
    [user]
  );

  // Mappa la lista fresca marcando letta (per id, o tutte).
  var markLette = useCallback(
    function (lista: Notifica[], id?: string) {
      var sid = id != null ? String(id) : null;
      return lista.map(function (n) {
        if (sid === null || String(n.id) === sid) return Object.assign({}, n, { letta: true });
        return n;
      });
    },
    []
  );

  // Unisce la lista appena letta dal server con lo snapshot locale (per id):
  // nessuna notifica arriva tra read e write va persa, anche senza transaction.
  var mergeListe = useCallback(
    function (fresh: Notifica[], local: Notifica[]) {
      var ids = fresh.map(function (n) {
        return String(n.id);
      });
      return fresh.concat(
        local.filter(function (n) {
          return ids.indexOf(String(n.id)) < 0;
        })
      );
    },
    []
  );

  // Scrive segnando letta (tutte, o una per id). NIENTE runTransaction: il
  // commit di una transaction porta currentDocument.updateTime come
  // precondizione, e quando il doc notifiche è aggiornato da altri client
  // (fan-out "nuova card" in una classe live) tra read e commit Firestore
  // risponde 400 failed-precondition a ogni tentativo → il clic non faceva
  // NULLA. Con get+set (senza precondizione) la scrittura si applica sempre;
  // mergeListe copre l'arrivo di notifiche nel frattempo.
  var markAndWrite = useCallback(
    function (id?: string) {
      if (!user || !user.uid) return;
      var db = getDbN();
      if (!db) return;
      var ref = db.collection('notifiche').doc(user.uid);
      ref
        .get()
        .then(function (doc: any) {
          var fresh = doc.exists && doc.data().lista ? (doc.data().lista as Notifica[]) : [];
          var next = markLette(mergeListe(fresh, lista), id);
          return ref.set({ lista: next, aggiornato: new Date().toISOString() }, { merge: true });
        })
        .catch(function (e: any) {
          console.warn('[notifiche] markAndWrite fallback (read: ' + ((e && e.code) || e) + ')');
          writeLista(markLette(lista, id));
        });
    },
    [user, lista, writeLista, markLette, mergeListe]
  );

  var segnaLetta = useCallback(
    function (id: string) {
      markAndWrite(id);
    },
    [markAndWrite]
  );

  return {
    notifiche: lista,
    nonLette: nonLette,
    segnaLetta: segnaLetta,
    setNotifiche: setLista,
  };
}

export default useNotifiche;
export type { Notifica };
