// firestore-sync-isolation.test.ts — regressione bug #7: gli store erano
// singleton a livello di modulo, quindi il destroy() di un'istanza puliva i
// listener/sottoscrizioni di TUTTI gli altri consumatori. Dopo il refactor
// ogni createXxxStore possiede il proprio stato: il destroy di una istanza non
// deve toccare i listener né la sottoscrizione delle altre.
import { describe, it, expect, vi } from 'vitest';
import './firestore-sync.ts'; // registra window.__firestoreSync

// db finto: due istanze di store fanno la stessa query → condividono la lista
// dei callback onSnapshot. L'importante è che il destroy di un'istanza rimuova
// SOLO il proprio callback (come farebbe un unsubscribe reale di Firestore).
function makeDb() {
  const listeners = new Set();
  const q: any = {
    where: () => q,
    onSnapshot: (next: any, err: any) => {
      listeners.add(next);
      return () => listeners.delete(next);
    },
  };
  return {
    collection: () => q,
    _fire: (data: any[]) => {
      listeners.forEach((fn: any) =>
        fn({
          forEach: (cb: any) => data.forEach((d: any) => cb({ data: () => d })),
        })
      );
    },
  };
}

describe('firestore-sync — istanze isolate (bug #7)', () => {
  it('destroy di una istanza non tocca i listener dell\'altra', () => {
    const db: any = makeDb();
    (window as any).db = db;

    const createCardsStore = (window as any).__firestoreSync.createCardsStore;
    const a = createCardsStore({ uid: 'u1', role: 'prof' }, '2026/2027');
    const b = createCardsStore({ uid: 'u2', role: 'prof' }, '2026/2027');

    const la = vi.fn();
    const lb = vi.fn();
    a.subscribe(la);
    b.subscribe(lb);

    a.destroy();

    // Un aggiornamento dopo il destroy di A: solo il listener di B scatta
    db._fire([{ id: 'c1' }]);
    expect(la).not.toHaveBeenCalled();
    expect(lb).toHaveBeenCalledTimes(1);
    expect(b.getSnapshot()).toEqual([{ id: 'c1' }]);
    expect(b.getLoaded()).toBe(true);

    // A è morta: snapshot vuoto e loaded false
    expect(a.getSnapshot()).toEqual([]);
    expect(a.getLoaded()).toBe(false);

    b.destroy();
  });

  it('re-subscribe dopo destroy riattiva la sottoscrizione (StrictMode)', () => {
    const db: any = makeDb();
    (window as any).db = db;

    const createCardsStore = (window as any).__firestoreSync.createCardsStore;
    const store = createCardsStore({ uid: 'u1', role: 'studente' }, '2026/2027');
    const l = vi.fn();
    const unsub = store.subscribe(l);
    store.destroy();
    // React StrictMode: cleanup → setup sullo stesso store
    store.subscribe(l);

    db._fire([{ id: 'c1' }]);
    expect(l).toHaveBeenCalled();
    expect(store.getSnapshot()).toEqual([{ id: 'c1' }]);
    expect(store.getLoaded()).toBe(true);

    unsub();
    store.destroy();
  });
});
