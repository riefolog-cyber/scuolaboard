// firebase-modular.test.ts — Unit test dello shim compat (Fase 5)
// Verifica che firebase-modular.ts esponga la STESSA superficie namespaced del
// compat SDK usata dal codebase, senza fare NESSUNA chiamata di rete:
// initializeApp idempotente, db.collection(...).doc/where/orderBy/get/onSnapshot,
// FieldValue.arrayUnion, auth() con metodi namespaced + GoogleAuthProvider.
// NB: i test di integrazione iniettano un fake (harness.ts), quindi questo file
// è l'unico a esercitare lo shim REALE (production-only).
import { describe, it, expect, beforeEach } from 'vitest';
import { firebase } from './firebase-modular.ts';

describe('firebase-modular shim (surface compat)', () => {
  // Il guard di idempotenza nello shim rende initializeApp richiamabile più volte
  // (stessa istanza app) → niente try/catch: un errore reale deve far fallire il test.
  beforeEach(() => {
    firebase.initializeApp({ projectId: 'scuolaboard-test', apiKey: 'fake-key' });
  });

  it('initializeApp è idempotente (stessa istanza app)', () => {
    const app = firebase.initializeApp({ projectId: 'scuolaboard-test' });
    expect(app).toBeTruthy();
    expect(firebase.app()).toBe(app);
  });

  it('db.collection(...) espone la catena compat (doc/where/orderBy/get/onSnapshot)', () => {
    const db = firebase.firestore();
    const coll = db.collection('cards');
    expect(typeof coll.doc).toBe('function');
    expect(typeof coll.where).toBe('function');
    expect(typeof coll.orderBy).toBe('function');
    expect(typeof coll.get).toBe('function');
    expect(typeof coll.onSnapshot).toBe('function');

    const docRef = coll.doc('c1');
    expect(typeof docRef.get).toBe('function');
    expect(typeof docRef.set).toBe('function');
    expect(typeof docRef.update).toBe('function');
    expect(typeof docRef.delete).toBe('function');
    expect(typeof docRef.onSnapshot).toBe('function');
    // ref reale necessario a runTransaction/writeBatch
    expect(docRef.ref).toBeTruthy();

    const filtered = coll.where('annoScolastico', '==', '2026/2027').orderBy('ordine', 'asc');
    expect(typeof filtered.get).toBe('function');
    expect(typeof filtered.onSnapshot).toBe('function');
  });

  it('db espone runTransaction e batch', () => {
    const db = firebase.firestore();
    expect(typeof db.runTransaction).toBe('function');
    expect(typeof db.batch).toBe('function');
    const b = db.batch();
    expect(typeof b.delete).toBe('function');
    expect(typeof b.commit).toBe('function');
  });

  it('espone firestore.FieldValue.arrayUnion', () => {
    const fn = firebase.firestore.FieldValue.arrayUnion;
    expect(typeof fn).toBe('function');
    expect(fn({ id: 1 })).toBeTruthy();
  });

  it('auth() espone onAuthStateChanged + metodi namespaced e GoogleAuthProvider', () => {
    const auth = firebase.auth();
    expect(typeof auth.onAuthStateChanged).toBe('function');
    expect(typeof auth.signInWithPopup).toBe('function');
    expect(typeof auth.signInWithRedirect).toBe('function');
    expect(typeof auth.getRedirectResult).toBe('function');
    expect(typeof auth.signOut).toBe('function');
    expect(firebase.auth.GoogleAuthProvider).toBeTruthy();
    expect(new firebase.auth.GoogleAuthProvider()).toBeTruthy();
  });

  it("storage è graceful (null, l'app non usa Storage)", () => {
    expect(firebase.storage()).toBeNull();
  });
});
