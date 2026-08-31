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
      if (!db) return;
      var sid = String(id);
      var next = lista.map(function (n) {
        return String(n.id) === sid ? Object.assign({}, n, { letta: true }) : n;
      });
      db.collection('notifiche')
        .doc(user.uid)
        .set({ lista: next, aggiornato: new Date().toISOString() }, { merge: true });
    },
    [lista, user]
  );

  var segnaTutteLette = useCallback(
    function () {
      if (!user || !user.uid || !lista.length) return;
      var db = getDbN();
      if (!db) return;
      var next = lista.map(function (n) {
        return Object.assign({}, n, { letta: true });
      });
      db.collection('notifiche')
        .doc(user.uid)
        .set({ lista: next, aggiornato: new Date().toISOString() }, { merge: true });
    },
    [lista, user]
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
