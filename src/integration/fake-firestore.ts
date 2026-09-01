// @ts-nocheck — fake Firestore in-memory per i test di integrazione
// Supporta: collection, doc, where, orderBy, get, onSnapshot, runTransaction,
// FieldValue.arrayUnion. Emula il comportamento essenziale del Firestore reale.

function resolveFieldValues(data, existing) {
  const out = {};
  for (const [k, v] of Object.entries(data || {})) {
    if (v && typeof v === 'object' && v.__arrayUnion) {
      out[k] = ((existing && existing[k]) || []).concat(v.__arrayUnion);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function matches(doc, where) {
  const v = doc[where.field];
  if (where.op === '==') return v === where.value;
  if (where.op === 'array-contains') return Array.isArray(v) && v.includes(where.value);
  if (where.op === 'in') return Array.isArray(where.value) && where.value.includes(v);
  return true;
}

export function createFakeDb(seed = {}) {
  const collections = {};
  const queryListeners = {};
  const docListeners = {};

  for (const [coll, docs] of Object.entries(seed)) {
    collections[coll] = { ...docs };
  }

  function notifyCollection(name) {
    (queryListeners[name] || new Set()).forEach((fn) => fn());
  }
  function notifyDoc(name, id) {
    (docListeners[name + '/' + id] || new Set()).forEach((fn) => fn());
  }

  function queryDocs(name, wheres, orderBy) {
    let docs = Object.entries(collections[name] || {}).map(([id, data]) => ({ id, data }));
    for (const w of wheres) docs = docs.filter((d) => matches(d.data, w));
    if (orderBy) {
      docs.sort((a, b) => {
        const av = a.data[orderBy.field] == null ? 0 : a.data[orderBy.field];
        const bv = b.data[orderBy.field] == null ? 0 : b.data[orderBy.field];
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return orderBy.dir === 'desc' ? -cmp : cmp;
      });
    }
    return docs;
  }

  class FakeQuery {
    constructor(name, wheres = [], orderByClause = null) {
      this.name = name;
      this.wheres = wheres;
      this._orderBy = orderByClause;
    }
    doc(id) {
      return new FakeDocRef(this.name, id);
    }
    where(field, op, value) {
      return new FakeQuery(this.name, this.wheres.concat([{ field, op, value }]), this._orderBy);
    }
    orderBy(field, dir = 'asc') {
      return new FakeQuery(this.name, this.wheres, { field, dir });
    }
    async get() {
      const docs = queryDocs(this.name, this.wheres, this._orderBy);
      return {
        docs: docs.map((d) => ({ id: d.id, exists: true, data: () => d.data })),
        forEach(cb) {
          docs.forEach((d) => cb({ id: d.id, exists: true, data: () => d.data }));
        },
      };
    }
    onSnapshot(cb) {
      const fire = () => {
        const docs = queryDocs(this.name, this.wheres, this._orderBy);
        cb({
          docs: docs.map((d) => ({ id: d.id, exists: true, data: () => d.data })),
          forEach(fn) {
            docs.forEach((d) => fn({ id: d.id, exists: true, data: () => d.data }));
          },
        });
      };
      (queryListeners[this.name] ||= new Set()).add(fire);
      // Fire asincrono (come il Firestore reale): evita setState durante la render
      queueMicrotask(() => fire());
      return () => (queryListeners[this.name] || new Set()).delete(fire);
    }
  }

  class FakeDocRef {
    constructor(name, id) {
      this.name = name;
      this.id = id;
    }
    async get() {
      const data = (collections[this.name] || {})[this.id];
      return { exists: !!data, data: () => data, id: this.id };
    }
    async set(data, opts) {
      collections[this.name] = collections[this.name] || {};
      const existing = collections[this.name][this.id] || {};
      const merged = resolveFieldValues(data, opts && opts.merge ? existing : null);
      collections[this.name][this.id] = opts && opts.merge ? { ...existing, ...merged } : merged;
      notifyCollection(this.name);
      notifyDoc(this.name, this.id);
    }
    async update(patch) {
      collections[this.name] = collections[this.name] || {};
      const existing = collections[this.name][this.id] || {};
      collections[this.name][this.id] = { ...existing, ...resolveFieldValues(patch, existing) };
      notifyCollection(this.name);
      notifyDoc(this.name, this.id);
    }
    async delete() {
      if (collections[this.name]) delete collections[this.name][this.id];
      notifyCollection(this.name);
      notifyDoc(this.name, this.id);
    }
    onSnapshot(cb) {
      const fire = () => {
        const data = (collections[this.name] || {})[this.id];
        cb({ exists: !!data, data: () => data, id: this.id });
      };
      (docListeners[this.name + '/' + this.id] ||= new Set()).add(fire);
      queueMicrotask(() => fire());
      return () => (docListeners[this.name + '/' + this.id] || new Set()).delete(fire);
    }
  }

  const db = {
    // Svuota e ri-seeda TUTTE le collection sullo stesso riferimento db.
    // Necessario: i moduli (firestore-sync) catturano window.db una sola volta,
    // quindi tra i test di uno stesso file NON possiamo creare un nuovo db,
    // ma dobbiamo resettare questo e riutilizzarlo.
    _reset(seed = {}) {
      for (const k of Object.keys(collections)) delete collections[k];
      for (const k of Object.keys(queryListeners)) delete queryListeners[k];
      for (const k of Object.keys(docListeners)) delete docListeners[k];
      for (const [coll, docs] of Object.entries(seed)) {
        collections[coll] = { ...docs };
      }
    },
    runTransaction(fn) {
      const tx = {
        get: (ref) => ref.get(),
        set: (ref, data, opts) => ref.set(data, opts),
        update: (ref, patch) => ref.update(patch),
      };
      return fn(tx);
    },
    batch() {
      // writeBatch compat: accumula le operazioni e le applica tutte al commit
      // (il commit è "atomico" quanto il set diretto nel fake: ogni op notifica
      // i listener come farebbe un'operazione singola).
      const ops = [];
      const b = {
        set: (ref, data, opts) => {
          ops.push({ kind: 'set', ref, data, opts });
        },
        update: (ref, patch) => {
          ops.push({ kind: 'update', ref, patch });
        },
        delete: (ref) => {
          ops.push({ kind: 'delete', ref });
        },
        async commit() {
          for (const op of ops) {
            if (op.kind === 'set') await op.ref.set(op.data, op.opts);
            else if (op.kind === 'update') await op.ref.update(op.patch);
            else await op.ref.delete();
          }
        },
      };
      return b;
    },
    collection(name) {
      return new FakeQuery(name);
    },
    // Espone i listener esistenti per poterli verificare/azzerare
    _listeners(name) {
      return queryListeners[name] || new Set();
    },
    // Helpers per le asserzioni nei test
    _get(name, id) {
      return (collections[name] || {})[id];
    },
    _all(name) {
      return Object.entries(collections[name] || {});
    },
    _seed(name, docs) {
      collections[name] = { ...(collections[name] || {}), ...docs };
      notifyCollection(name);
    },
  };
  return db;
}
