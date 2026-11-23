// @ts-nocheck — il memo delle card dipende dall'IDENTITÀ degli oggetti: è questo
// che si verifica, non la forma dei tipi.
import { describe, it, expect } from 'vitest';
import './firestore-sync.ts'; // registra window.__firestoreSync (boot del modulo)
import { applicaDocChanges, aggiornaMappaDaSnapshot, cardsDaMappa } from './firestore-sync.ts';

function cards(n: number) {
  var out: any[] = [];
  for (var i = 1; i <= n; i++) out.push({ id: 'c' + i, titolo: 'Card ' + i, commenti: [] });
  return out;
}

// Forma minima di un QuerySnapshot: `forEach` per l'ordine, `docChanges` per i
// cambi, `doc.data()` che restituisce l'oggetto passato.
function snapshotConCambi(lista: any[], changes: any[]) {
  return {
    forEach: function (cb: any) {
      lista.forEach(function (c: any) {
        cb({ id: c.id, data: function () { return c; } });
      });
    },
    docChanges: function () {
      return changes.map(function (ch: any) {
        return { type: ch.type, doc: { id: ch.id, data: function () { return ch.data; } } };
      });
    },
  };
}

describe('firestore-sync · riuso delle identità (memo delle card)', function () {
  it('il difetto di prima: ricostruire da data() dà una nuova identità a TUTTE le card', function () {
    var prima = cards(30);
    // In Firestore reale `data()` costruisce un oggetto JS nuovo a ogni snapshot
    // (il fake dei test restituisce lo stesso). Qui si simula il caso reale: era
    // esattamente ciò che faceva lo store prima della correzione.
    var dopo = prima.map(function (c) { return Object.assign({}, c); });
    var cambiate = dopo.filter(function (c, i) { return c !== prima[i]; }).length;
    // `cardItemAreEqual` esce alla prima riga (prev.c !== next.c) per ognuna:
    // 30 card, 30 render per un solo cambiamento.
    expect(cambiate).toBe(30);
  });

  it('con docChanges: un solo documento cambiato ⇒ una sola identità nuova', function () {
    var prima = cards(30);
    var perId = new Map<string, any>(prima.map(function (c) { return [c.id, c]; }));
    var modificata = Object.assign({}, prima[4], { titolo: 'Card 5 aggiornata' });
    var dopo = cardsDaMappa(
      aggiornaMappaDaSnapshot(
        perId,
        snapshotConCambi(prima, [{ type: 'modified', id: 'c5', data: modificata }])
      ),
      prima.map(function (c) { return c.id; })
    );
    var cambiate = dopo.filter(function (c, i) { return c !== prima[i]; }).length;
    expect(cambiate).toBe(1);
    expect(dopo[4]).toBe(modificata);
    // Le altre 29 sono gli STESSI oggetti: il memo salta il render.
    expect(dopo[0]).toBe(prima[0]);
    expect(dopo[29]).toBe(prima[29]);
  });

  it('removed toglie la card e added la inserisce senza toccare le altre', function () {
    var prima = cards(3);
    var perId = new Map<string, any>(prima.map(function (c) { return [c.id, c]; }));
    var nuova = { id: 'c9', titolo: 'Nuova', commenti: [] };
    var next = aggiornaMappaDaSnapshot(
      perId,
      snapshotConCambi([prima[0], prima[2], nuova], [
        { type: 'removed', id: 'c2' },
        { type: 'added', id: 'c9', data: nuova },
      ])
    );
    var dopo = cardsDaMappa(next, ['c1', 'c2', 'c3', 'c9']);
    expect(dopo.map(function (c) { return c.id; })).toEqual(['c1', 'c3', 'c9']);
    expect(dopo[0]).toBe(prima[0]);
    expect(dopo[1]).toBe(prima[2]);
  });

  it('snapshot senza docChanges (fake dei test): riusa l’identità quando data() è lo stesso oggetto', function () {
    var prima = cards(3);
    var perId = new Map<string, any>(prima.map(function (c) { return [c.id, c]; }));
    var snap = {
      forEach: function (cb: any) {
        prima.forEach(function (c: any) {
          cb({ id: c.id, data: function () { return c; } });
        });
      },
    };
    var dopo = cardsDaMappa(aggiornaMappaDaSnapshot(perId, snap), prima.map(function (c) { return c.id; }));
    expect(dopo[0]).toBe(prima[0]);
    expect(dopo[2]).toBe(prima[2]);
  });

  it('un modified con data undefined rimuove la card (non la lascia vecchia)', function () {
    // `'data' in ch` (invece di `ch.data !== undefined`) è deliberato: scartare
    // il cambio maschererebbe un dato mancante come "nessun cambiamento".
    var perId = new Map<string, any>([['c1', { id: 'c1', titolo: 'Vecchia' }]]);
    var next = applicaDocChanges(perId, [{ type: 'modified', id: 'c1', data: undefined }]);
    expect(cardsDaMappa(next, ['c1'])).toEqual([]);
  });

  it('removed resta cancellata anche con data presente', function () {
    var perId = new Map<string, any>([['c1', { id: 'c1' }]]);
    var next = applicaDocChanges(perId, [{ type: 'removed', id: 'c1', data: { id: 'c1' } }]);
    expect(next.size).toBe(0);
  });

  it('applicaDocChanges non muta la mappa ricevuta', function () {
    var perId = new Map<string, any>([['c1', { id: 'c1' }]]);
    var next = applicaDocChanges(perId, [{ type: 'removed', id: 'c1' }]);
    expect(perId.size).toBe(1);
    expect(next.size).toBe(0);
  });
});
