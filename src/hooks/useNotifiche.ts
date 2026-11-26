// useNotifiche.ts · ScuolaBoard · hook notifiche in-app (solo app aperta)
// Collezione: notifiche/{uid} doc { lista: Notification[], letta: string[], aggiornato: ISO }
//
// ── Perché lo stato "letta" vive nel campo `letta` e non nelle voci ──
// Marcare letta una notifica era NEGATO dalle Firestore Rules allo studente.
// `aggiornaNotifica` concede al proprietario solo i campi [letta, aggiornato],
// mentre il client riscriveva l'intera `lista` con `letta: true` sulle voci: le
// chiavi cambiate erano `lista`+`aggiornato`, quindi il ramo proprietario non
// combaciava, e il ramo studente (che ammette `lista`) pretende `hasAll` sulle
// voci precedenti — che una voce modificata non soddisfa. Esito: due scritture
// negate per ogni clic, nessun messaggio, badge mai spento per gli studenti (il
// prof passava perché `isProf()` lascia tutto). Ora `letta` è l'ELENCO DEGLI ID
// già letti: è l'unica scrittura che le rules consentono al proprietario, non
// riscrive la lista (quindi non corre con il fan-out, che usa arrayUnion) e
// conserva le letture dei documenti vecchi, dove il flag stava sulla voce.
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

function getDbN() {
  return typeof window !== 'undefined' ? (window as any).db : null;
}

// Dedupe per id. Le notifiche di una card hanno un id DETERMINISTICO
// (`nuova_card_<cardId>`): se il fan-out viene ripetuto — perché il browser del
// prof si era chiuso a metà e il recupero ha ri-annunciato la card — lo studente
// si ritrova due voci identiche. Qui ne resta una sola, quella più vecchia.
function dedupeNotifiche(lista: Notifica[] | undefined | null): Notifica[] {
  var seen: any = {};
  var out: Notifica[] = [];
  (lista || []).forEach(function (n: any) {
    if (!n || n.id == null) return;
    var k = String(n.id);
    if (seen[k]) return;
    seen[k] = true;
    out.push(n);
  });
  return out;
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

// Gli id già letti, leggendo entrambe le forme: il campo `letta` (array, o mappa
// {id: true} se un giorno cambiasse forma) e il flag sulla singola voce scritto
// dalle versioni precedenti. Restano solo gli id che hanno ancora una voce:
// `lista` è tagliata a 50 dal fan-out, e gli id orfani crescerebbero senza limite.
// Esportata perché è pura: il test la prova senza montare React.
export function idsLetti(campo: any, lista: Notifica[]): string[] {
  var visti: any = {};
  var ordine: string[] = [];
  function aggiungi(x: any) {
    if (x == null || x === '') return;
    var k = String(x);
    if (visti[k]) return;
    visti[k] = true;
    ordine.push(k);
  }
  if (Array.isArray(campo)) campo.forEach(aggiungi);
  else if (campo && typeof campo === 'object') {
    Object.keys(campo).forEach(function (k: string) {
      if (campo[k]) aggiungi(k);
    });
  }
  (lista || []).forEach(function (n: any) {
    if (n && n.letta === true) aggiungi(n.id);
  });
  var presenti: any = {};
  (lista || []).forEach(function (n: any) {
    if (n && n.id != null) presenti[String(n.id)] = true;
  });
  return ordine.filter(function (x: string) {
    return presenti[x] === true;
  });
}

function useNotifiche(deps: { user: any }) {
  var user = deps.user;
  var uid = user && user.uid ? user.uid : null;
  var [lista, setLista] = useState<Notifica[]>([]);
  var [lette, setLette] = useState<string[]>([]);
  // Copie live per `segnaLetta`: il callback non deve richiudersi su uno stato
  // vecchio (due clic ravvicinati perderebbero il primo id).
  var listaRef = useRef<Notifica[]>([]);
  var letteRef = useRef<string[]>([]);

  useEffect(
    function () {
      var db = getDbN();
      if (!uid || !db) {
        listaRef.current = [];
        letteRef.current = [];
        setLista([]);
        setLette([]);
        return;
      }
      var unsub = db
        .collection('notifiche')
        .doc(uid)
        .onSnapshot(
          function (doc: any) {
            var esiste = !!(doc && doc.exists);
            var d = esiste ? doc.data() || {} : {};
            var l = esiste ? dedupeNotifiche(d.lista) : [];
            var ids = idsLetti(d.letta, l);
            listaRef.current = l;
            letteRef.current = ids;
            setLista(l);
            setLette(ids);
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
    [uid]
  );

  // Le voci esposte portano `letta` DERIVATA dall'elenco: chi le mostra (`Header`)
  // continua a leggere `n.letta` e non deve sapere dove sta la verità.
  var notifiche = useMemo(
    function () {
      var visti: any = {};
      lette.forEach(function (id: string) {
        visti[id] = true;
      });
      return lista.map(function (n: any) {
        return Object.assign({}, n, { letta: !!visti[String(n.id)] });
      });
    },
    [lista, lette]
  );

  var nonLette = useMemo(
    function () {
      return notifiche.filter(function (n) {
        return !n.letta;
      }).length;
    },
    [notifiche]
  );

  // Scrive SOLO `letta` + `aggiornato` sul proprio doc: è la forma che le rules
  // ammettono per il proprietario. Niente get+set dell'intera lista: la lista la
  // aggiorna il fan-out con arrayUnion, e un set concorrente la perderebbe.
  var segnaLetta = useCallback(
    function (id: string) {
      if (!uid || id == null) return;
      var db = getDbN();
      if (!db) return;
      var sid = String(id);
      var prima = letteRef.current;
      if (prima.indexOf(sid) >= 0) return;
      var presenti: any = {};
      listaRef.current.forEach(function (n: any) {
        if (n && n.id != null) presenti[String(n.id)] = true;
      });
      presenti[sid] = true;
      var dopo = prima.filter(function (x: string) {
        return presenti[x] === true;
      });
      dopo.push(sid);
      // Ottimistico: il badge si spegne subito, senza aspettare lo snapshot.
      letteRef.current = dopo;
      setLette(dopo);
      var p = db
        .collection('notifiche')
        .doc(uid)
        .set({ letta: dopo, aggiornato: new Date().toISOString() }, { merge: true });
      if (p && typeof p.then === 'function') {
        p.catch(function (e: any) {
          // Scrittura negata (rules non pubblicate come nel repository) o rete giù:
          // rimetto lo stato di prima, così il badge non resta spento su un dato che
          // il server non ha. Niente toast: è una preferenza di lettura, non un dato
          // dell'utente andato perso.
          letteRef.current = prima;
          setLette(prima);
          console.warn('[notifiche] segnaLetta: ' + ((e && e.code) || e));
        });
      }
    },
    [uid]
  );

  return {
    notifiche: notifiche,
    nonLette: nonLette,
    segnaLetta: segnaLetta,
  };
}

export default useNotifiche;
export type { Notifica };
