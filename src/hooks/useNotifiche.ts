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

  var segnaLetta = useCallback(
    function (id: string) {
      if (!user || !user.uid) return;
      var db = getDbN();
      if (!db || typeof db.runTransaction !== 'function') return;
      var sid = String(id);
      var uid = user.uid;
      var ref = db.collection('notifiche').doc(uid);
      // Transaction: il vecchio read-modify-write sull'intero doc perdeva le
      // notifiche arrivate tra snapshot e scrittura (lost-update).
      db.runTransaction(function (t: any) {
        return t.get(ref).then(function (doc: any) {
          var lista = doc.exists && doc.data().lista ? doc.data().lista : [];
          var next = lista.map(function (n: any) {
            return String(n.id) === sid ? Object.assign({}, n, { letta: true }) : n;
          });
          return t.set(ref, { lista: next, aggiornato: new Date().toISOString() }, { merge: true });
        });
      }).catch(function (e: any) {
        if (typeof window !== 'undefined' && (window as any).SB_DEBUG)
          console.warn('[notifiche] segnaLetta', e && e.code);
      });
    },
    [user]
  );

  var segnaTutteLette = useCallback(
    function () {
      if (!user || !user.uid) return;
      var db = getDbN();
      if (!db || typeof db.runTransaction !== 'function') return;
      var uid = user.uid;
      var ref = db.collection('notifiche').doc(uid);
      db.runTransaction(function (t: any) {
        return t.get(ref).then(function (doc: any) {
          var lista = doc.exists && doc.data().lista ? doc.data().lista : [];
          if (!lista.length) return null;
          var next = lista.map(function (n: any) {
            return Object.assign({}, n, { letta: true });
          });
          return t.set(ref, { lista: next, aggiornato: new Date().toISOString() }, { merge: true });
        });
      }).catch(function (e: any) {
        if (typeof window !== 'undefined' && (window as any).SB_DEBUG)
          console.warn('[notifiche] segnaTutteLette', e && e.code);
      });
    },
    [user]
  );

  return {
    notifiche: lista,
    nonLette: nonLette,
    segnaLetta: segnaLetta,
    segnaTutteLette: segnaTutteLette,
    setNotifiche: setLista,
  };
}

export default useNotifiche;
export type { Notifica };
