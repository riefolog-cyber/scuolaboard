// firestore-services.test.ts — unit test del layer servizi Firestore.
// Il modulo legge window.SB.db a livello di modulo → import dinamico dopo
// aver configurato i mock (stessa convenzione degli altri test del progetto).
import { describe, it, expect, beforeEach, vi } from 'vitest';

function fakeDb(overrides: any = {}) {
  const calls: any = { set: [], update: [], delete: [], get: [], runTransaction: [] };
  const doc: any = (id: any) => ({
    id,
    set: (data: any, opts?: any) => {
      calls.set.push({ id, data, opts });
      return Promise.resolve();
    },
    update: (data: any) => {
      calls.update.push({ id, data });
      return Promise.resolve();
    },
    delete: () => {
      calls.delete.push(id);
      return Promise.resolve();
    },
    get: () => {
      calls.get.push(id);
      return Promise.resolve(
        overrides.docGet ? overrides.docGet(id) : { exists: false, data: () => ({}) }
      );
    },
  });
  const collection: any = (name: any) => ({
    name,
    doc,
    get: () => {
      calls.get.push(name + '/*');
      return Promise.resolve(
        overrides.collectionGet || { forEach: () => {} }
      );
    },
  });
  const db: any = {
    collection,
    runTransaction: (fn: any) => {
      calls.runTransaction.push(fn);
      const t: any = {
        get: (ref: any) => ref.get(),
        set: (ref: any, data: any, opts?: any) => ref.set(data, opts),
        update: (ref: any, data: any) => ref.update(data),
        delete: (ref: any) => ref.delete(),
      };
      return fn(t);
    },
  };
  return { db, calls };
}

async function loadServices() {
  vi.resetModules();
  delete window.SB.services;
  // Il file non è un modulo ES (non ha export): l'import esegue solo gli effetti
  // @ts-ignore
  await import('./firestore-services.ts');
  // Il modulo non esporta: registra tutto su SB.services
  return window.SB.services as any;
}

describe('firestore-services', () => {
  let sb: any;
  let dbg: any;

  beforeEach(() => {
    window.SB = window.SB || {};
    sb = window.SB;
    dbg = fakeDb();
    sb.db = dbg.db;
    // Nessun delegato SB.fbSave/fbDel: si usano i path diretti del db
    delete sb.fbSave;
    delete sb.fbDel;
    delete sb.services;
    sb.aiCacheSetAll = vi.fn();
  });

  it('saveCard scrive il doc cards/{id} con set', async () => {
    const services: any = await loadServices();
    const card = { id: 'c1', titolo: 'T' };
    await services.saveCard(card);
    expect(dbg.calls.set).toHaveLength(1);
    expect(dbg.calls.set[0].id).toBe('c1');
    expect(dbg.calls.set[0].data).toEqual(card);
  });

  it('saveCard delega a SB.fbSave se disponibile (pattern offline)', async () => {
    const fbSave = vi.fn().mockResolvedValue(true);
    sb.fbSave = fbSave;
    const services: any = await loadServices();
    const card = { id: 'c1', titolo: 'T' };
    const out = await services.saveCard(card);
    expect(fbSave).toHaveBeenCalledWith(card);
    expect(dbg.calls.set).toHaveLength(0);
    expect(out).toBe(true);
  });

  it('delCard elimina il doc con delete', async () => {
    const services: any = await loadServices();
    await services.delCard('c9');
    expect(dbg.calls.delete).toEqual(['c9']);
  });

  it('updateCard applica update con fallback a fbSave su errore', async () => {
    const updateMock = vi.fn().mockRejectedValue(new Error('offline'));
    const fallbackCard = { id: 'c2', titolo: 'Nuovo' };
    const fbSave = vi.fn().mockResolvedValue(true);
    sb.fbSave = fbSave;
    const dbx: any = fakeDb();
    dbx.db.collection = () => ({ doc: () => ({ update: updateMock }) });
    sb.db = dbx.db;
    const services: any = await loadServices();
    await services.updateCard('c2', { titolo: 'X' }, fallbackCard);
    expect(updateMock).toHaveBeenCalledWith({ titolo: 'X' });
    expect(fbSave).toHaveBeenCalledWith(fallbackCard);
  });

  it('updateCard fallisce se non c’è fbSave né update', async () => {
    const dbx: any = fakeDb();
    dbx.db.collection = () => ({ doc: () => ({ update: () => Promise.reject(new Error('x')) }) });
    sb.db = dbx.db;
    const services: any = await loadServices();
    await expect(services.updateCard('c3', { a: 1 }, null)).rejects.toThrow(
      'updateCard fallback failed'
    );
  });

  it('refreshAiMap popola la mappa e notifica SB.aiCacheSetAll', async () => {
    const docs = [
      { id: 'c1', data: () => ({ analisi: 'ok' }) },
      { id: 'c2', data: () => ({ sommario: 'riassunto' }) },
    ];
    dbg.db.collection = () => ({
      get: () => Promise.resolve({ forEach: (cb: any) => docs.forEach(cb) }),
    });
    const services: any = await loadServices();
    const m = await services.refreshAiMap();
    expect(m.c1.analisi).toBe('ok');
    expect(m.c2.sommario).toBe('riassunto');
    expect(sb.aiCacheSetAll).toHaveBeenCalledWith(m);
  });

  it('addAmmonizione usa arrayUnion su ammonizioni/{autore} con merge', async () => {
    window.firebase = window.firebase || {};
    window.firebase.firestore = Object.assign(
      (() => undefined) as any,
      {
        FieldValue: {
          arrayUnion: (v: any) => ({ __op: 'arrayUnion', v }),
        },
      }
    );
    const services: any = await loadServices();
    const nuova = { id: 'a1', motivo: 'Disturbo' };
    await services.addAmmonizione('stud1', nuova);
    const op = dbg.calls.set[0];
    expect(op.id).toBe('stud1');
    expect(op.opts).toEqual({ merge: true });
    expect(op.data.lista.__op).toBe('arrayUnion');
    expect(op.data.lista.v).toEqual(nuova);
    expect(op.data.aggiornato).toBeTruthy();
  });

  it('getNewCardOrder incrementa il contatore in transazione', async () => {
    dbg.db.collection = () => ({
      doc: () => ({
        get: () => Promise.resolve({ exists: true, data: () => ({ nextCardOrder: 5 }) }),
        set: (data: any, opts?: any) => {
          dbg.calls.set.push({ id: 'counters', data, opts });
          return Promise.resolve();
        },
      }),
    });
    const services: any = await loadServices();
    const order = await services.getNewCardOrder();
    expect(order).toBe(6);
    const set = dbg.calls.set.find((c: any) => c.id === 'counters');
    expect(set.data.nextCardOrder).toBe(6);
    expect(set.opts).toEqual({ merge: true });
  });

  it('createCardWithOrder assegna ordine e salva', async () => {
    dbg.db.collection = (name: any) => ({
      doc: () => ({
        get: () => Promise.resolve({ exists: true, data: () => ({ nextCardOrder: 2 }) }),
        set: (data: any, opts?: any) => {
          dbg.calls.set.push({ id: name === 'cards' ? data.id : 'counters', data, opts });
          return Promise.resolve();
        },
      }),
    });
    const services: any = await loadServices();
    await services.createCardWithOrder({ id: 'c10', titolo: 'Nuova' });
    // createCardWithOrder ritorna il risultato del set (undefined): la verifica
    // è sul doc salvato, che deve contenere ordine = contatore + 1
    const cardSet = dbg.calls.set.find((c: any) => c.id === 'c10');
    expect(cardSet).toBeTruthy();
    expect(cardSet.data.ordine).toBe(3);
  });
});
