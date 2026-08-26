// firebase-modular.ts · ScuolaBoard · Fase 5: Modular SDK + sottile shim compat
// ─────────────────────────────────────────────────────────────────────────────
// Sostituisce l'SDK compat (firebase/compat/*, ~497 kB raw nel vendor chunk)
// con i moduli modular tree-shakeable (firebase/app, firebase/auth,
// firebase/firestore). Espone la STESSA superficie namespaced usata dal
// codebase (db.collection(...).doc(...).set(...), firebase.auth(),
// FieldValue.arrayUnion, ecc.), così i ~54 call-site esistenti restano
// invariati e i test di integrazione (che iniettano il proprio fake via
// harness.ts) non vengono toccati.
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from 'firebase/auth';
import {
  initializeFirestore,
  collection,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
  writeBatch,
  arrayUnion,
} from 'firebase/firestore';

let _app: any = null;
let _db: any = null;
let _auth: any = null;

// ── Adapter snapshot compat → shape { exists, data(), id, ref } ────────────
function compatDocSnap(d: any) {
  const ref = wrapRef(d.ref);
  return { exists: d.exists(), data: () => d.data(), id: d.id, ref };
}

function compatQuerySnap(s: any) {
  return {
    docs: s.docs.map(compatDocSnap),
    forEach(cb: (_d: any) => void) {
      s.docs.forEach((d: any) => cb(compatDocSnap(d)));
    },
  };
}

// ── DocRef compat: avvolge il DocumentReference modulare ───────────────────
function wrapRef(ref: any): any {
  return {
    ref, // ref reale per runTransaction/writeBatch
    get: async () => compatDocSnap(await getDoc(ref)),
    set: (data: any, opts?: any) => setDoc(ref, data, opts || {}),
    update: (patch: any) => updateDoc(ref, patch),
    delete: () => deleteDoc(ref),
    onSnapshot: (cb: (_d: any) => void) => onSnapshot(ref, (d: any) => cb(compatDocSnap(d))),
  };
}

// ── Query compat: chainable .where()/.orderBy()/.doc()/.get()/.onSnapshot() ─
function compatCollection(db: any, name: string) {
  const base = collection(db, name);
  function make(conds: any[], orders: any[]) {
    let q: any = base;
    for (const c of conds) q = query(q, where(c.field, c.op, c.value));
    for (const o of orders) q = query(q, orderBy(o.field, o.dir || 'asc'));
    return q;
  }
  function api(conds: any[], orders: any[]) {
    return {
      doc(id: string) {
        return wrapRef(doc(db, name, id));
      },
      where(field: string, op: string, value: any) {
        return api(conds.concat([{ field, op, value }]), orders);
      },
      orderBy(field: string, dir?: string) {
        return api(conds, orders.concat([{ field, dir }]));
      },
      async get() {
        return compatQuerySnap(await getDocs(make(conds, orders)));
      },
      onSnapshot(cb: (_s: any) => void) {
        return onSnapshot(make(conds, orders), (s: any) => cb(compatQuerySnap(s)));
      },
    };
  }
  return api([], []);
}

// ── db compat: collection()/runTransaction()/batch() ────────────────────────
// Memoizzata: window.db, SB.db e i moduli che catturano il riferimento al primo
// import (firestore-sync, app-utils) devono ricevere lo STESSO wrapper, altrimenti
// si romperebbe l'identità tra le istanze.
function compatDb() {
  if (!_db) {
    const fs = initializeFirestore(_app, { experimentalAutoDetectLongPolling: true });
    _db = {
      collection: (name: string) => compatCollection(fs, name),
      runTransaction: (fn: any) =>
        runTransaction(fs, async (tx) =>
          fn({
            get: async (ref: any) => compatDocSnap(await tx.get(ref.ref || ref)),
            set: (ref: any, data: any, opts?: any) => tx.set(ref.ref || ref, data, opts || {}),
            update: (ref: any, patch: any) => tx.update(ref.ref || ref, patch),
          })
        ),
      batch: () => {
        const b = writeBatch(fs);
        return {
          delete: (ref: any) => b.delete(ref.ref || ref),
          set: (ref: any, data: any, opts?: any) => b.set(ref.ref || ref, data, opts || {}),
          commit: () => b.commit(),
        };
      },
    };
  }
  return _db;
}

// ── Auth compat: getAuth() + metodi namespaced richiesti da auth.ts ────────
// Memoizzata: app-utils e auth.ts chiamano firebase.auth() due volte e devono
// ricevere la stessa istanza (gli metodi compat vengono attaccati una sola volta).
function compatAuth() {
  if (!_auth) {
    const auth: any = getAuth(_app);
    auth.signInWithPopup = (p: any) => signInWithPopup(auth, p);
    auth.signInWithRedirect = (p: any) => signInWithRedirect(auth, p);
    auth.getRedirectResult = () => getRedirectResult(auth);
    // ⚠️ NIENTE auth.signOut = () => signOut(auth): il signOut modulare di
    // firebase/auth chiama INTERNAMENTE auth.signOut() sull'istanza → il wrapper
    // sovrascriveva il metodo nativo e ricorreva all'infinito (RangeError:
    // Maximum call stack size exceeded) → "Esci" non chiudeva mai la sessione.
    // Il metodo nativo signOut dell'istanza è già quello modulare: va lasciato.
    _auth = auth;
  }
  return _auth;
}

// ── Namespace firebase compat (stessa forma di window.firebase) ────────────
const firestoreFn: any = () => compatDb();
firestoreFn.FieldValue = { arrayUnion };

const authFn: any = () => compatAuth();
authFn.GoogleAuthProvider = GoogleAuthProvider;

export const firebase: any = {
  // Guard di idempotenza: con Vite HMR un re-import di globals.ts ricarica il
  // modulo e il initializeApp modulare lancerebbe "already exists" → riuso _app
  // se presente, altrimenti un app già registrata nel registry Firebase
  // (getApps[0] copre anche il caso di HMR a re-eval completo, dove _app
  // torna null ma il registry Firebase conserva l'app).
  initializeApp: (config: any) => {
    if (_app) return _app;
    _app = getApps()[0] || initializeApp(config);
    return _app;
  },
  app: () => _app || getApp(),
  // L'app non usa Storage (immagini base64 in Firestore): shim graceful.
  storage: () => null,
  firestore: firestoreFn,
  auth: authFn,
};

export default firebase;
