// useAmmonizioni.ts · ScuolaBoard · hook di dominio: ammonizioni (stato,
// listener Firestore, modifica/eliminazione). Dipendenze: { user, myName }
import { useState, useEffect, useCallback } from 'react';

var db = window.db;

type AmmDep = { user: any; myName: (_u: any) => string };
type Amm = { id: string; motivazione?: string; modificata?: boolean };

function useAmmonizioni(deps: AmmDep) {
  var user = deps.user;
  var myName = deps.myName;

  // Ammonizioni
  var [ammonizioni, setAmmonizioni] = useState<Amm[]>([]);
  var [ammonizioniMap, setAmmonizioniMap] = useState<Record<string, Amm[]>>({});

  // Listener ammonizioni
  useEffect(
    function () {
      if (!user) return;
      var u5: (() => void) | null = null;
      if (user.role === 'studente') {
        u5 = db
          .collection('ammonizioni')
          .doc(myName(user))
          .onSnapshot(function (doc: any) {
            if (doc.exists) {
              setAmmonizioni(doc.data().lista || []);
            }
          });
      }
      db.collection('ammonizioni')
        .get()
        .then(function (snap: any) {
          var m: Record<string, Amm[]> = {};
          snap.forEach(function (doc: any) {
            m[doc.id] = doc.data().lista || [];
          });
          setAmmonizioniMap(m);
        })
        .catch(function () {});
      return function () {
        if (u5) u5();
      };
    },
    [user]
  );

  var modificaAmm = useCallback(
    function (nome: string, id: string, mot: string) {
      var lista = (ammonizioniMap[nome] || []).map(function (a: Amm) {
        return a.id === id ? Object.assign({}, a, { motivazione: mot, modificata: true }) : a;
      });
      db.collection('ammonizioni').doc(nome).set({ lista: lista });
    },
    [ammonizioniMap]
  );

  var eliminaAmm = useCallback(
    function (nome: string, id: string) {
      if (confirm('Eliminare?')) {
        var lista = (ammonizioniMap[nome] || []).filter(function (a: Amm) {
          return a.id !== id;
        });
        db.collection('ammonizioni').doc(nome).set({ lista: lista });
      }
    },
    [ammonizioniMap]
  );

  return {
    ammonizioni: ammonizioni,
    setAmmonizioni: setAmmonizioni,
    ammonizioniMap: ammonizioniMap,
    setAmmonizioniMap: setAmmonizioniMap,
    modificaAmm: modificaAmm,
    eliminaAmm: eliminaAmm,
  };
}
export default useAmmonizioni;
