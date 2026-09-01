// firestore-sync-error.test.ts — regressione: onSnapshot senza error handler.
// Un errore di permessi/rete lasciava _cardsLoaded=false per sempre → UI
// bloccata sullo skeleton. Ora l'error callback segna loaded=true con
// snapshot vuoto e notifica i listener (stato vuoto invece dello spinner).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import './firestore-sync.ts'; // registra window.__firestoreSync (test-setup lo stubba)

function makeFailingDb() {
  let cardsErr: any = null;
  const q: any = {
    where: () => q,
    onSnapshot: (next: any, err: any) => {
      cardsErr = err;
      return () => {};
    },
  };
  return {
    collection: () => q,
    _fireCardsError: (e: any) => {
      if (cardsErr) cardsErr(e);
    },
  };
}

describe('firestore-sync — error handler onSnapshot (cards)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('error callback: loaded=true, snapshot vuoto, listener notificati', () => {
    const db: any = makeFailingDb();
    (window as any).db = db;

    const createCardsStore = (window as any).__firestoreSync.createCardsStore;
    const store = createCardsStore({ uid: 'u1', role: 'studente' }, '2026/2027');
    const onStoreChange = vi.fn();
    const unsub = store.subscribe(onStoreChange);

    expect(store.getLoaded()).toBe(false);
    db._fireCardsError({ code: 'err-permission', message: 'denied' });

    expect(store.getLoaded()).toBe(true);
    expect(store.getSnapshot()).toEqual([]);
    expect(onStoreChange).toHaveBeenCalled();

    unsub();
    store.destroy();
  });
});
