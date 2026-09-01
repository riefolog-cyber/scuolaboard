// useDragDrop.ts · ScuolaBoard · hook drag & drop per il riordinamento delle
// card. Estratto da AppProvider per alleggerire il provider: riceve le card e
// la funzione di salvataggio come parametri, possiede il ref dragId.
// Il salvataggio del riordino usa un unico writeBatch (atomico) invece di N
// scritture separate.
import { useRef } from 'react';

// Riordinamento PURO e testabile: riordina l'INTERA lista dell'anno (non solo
// le card visibili) e ricompatta ordine a 1..N. Con un filtro classe attivo le
// card nascoste NON restano con ordine duplicati o stale: vengono riscritte in
// sequenza, e l'ordine relativo delle card visibili segue il drop dell'utente.
// Ritorna [] se fromId/toId non sono nella lista (nessun salvataggio).
export function reorderCards(cards: any[], fromId: any, toId: any): any[] {
  var arr = cards.slice().sort(function (a: any, b: any) {
    return (a.ordine || 0) - (b.ordine || 0);
  });
  var fi = arr.findIndex(function (c: any) {
    return String(c.id) === String(fromId);
  });
  var ti = arr.findIndex(function (c: any) {
    return String(c.id) === String(toId);
  });
  if (fi < 0 || ti < 0) return [];
  var moved = arr.splice(fi, 1)[0];
  arr.splice(ti, 0, moved);
  return arr.map(function (c: any, i: number) {
    return Object.assign({}, c, { ordine: i + 1 });
  });
}

export function useDragDrop(cards: any[], fbSave: (_c: any) => any) {
  var dragId = useRef<any>(null);

  function onDragStart(e: any, id: any) {
    dragId.current = id;
    e.dataTransfer.effectAllowed = 'move';
    // Necessario per Firefox: senza setData il drag non parte proprio.
    e.dataTransfer.setData('text/plain', String(id));
  }

  function onDragEnd(_e: any, _id: any) {
    document.querySelectorAll('.drag-over').forEach(function (el) {
      el.classList.remove('drag-over');
    });
  }

  function onDragOver(e: any, id: any) {
    e.preventDefault();
    if (String(dragId.current) === String(id)) return;
    var el = document.getElementById('card-' + id);
    if (el) el.classList.add('drag-over');
  }

  function onDragLeave(e: any, id: any) {
    var el = document.getElementById('card-' + id);
    // Il dragleave scatta anche muovendosi tra i figli della stessa card:
    // se il puntatore resta DENTRO la card, non rimuovere l'evidenziazione
    // (evita lo sfarfallio dell'outline durante il passaggio).
    if (el && e.relatedTarget && el.contains(e.relatedTarget)) return;
    if (el) el.classList.remove('drag-over');
  }

  function onDrop(e: any, targetId: any) {
    e.preventDefault();
    document.querySelectorAll('.drag-over').forEach(function (el) {
      el.classList.remove('drag-over');
    });
    var fromId = dragId.current;
    if (!fromId || String(fromId) === String(targetId)) return;
    var reordered = reorderCards(cards, fromId, targetId);
    if (!reordered.length) return;
    // Salvataggio ATOMICO in un unico writeBatch: N update → 1 commit.
    // Merge-set del solo campo ordine: payload minimo e nessun rischio di
    // sovrascrivere campi con dati stale (fbSave scriveva l'intero doc).
    // Fallback al vecchio fbSave per card se batch() non è disponibile
    // (stub/fake senza supporto) o se il commit fallisce (i batch sono
    // atomici: se il commit fallisce nulla è stato scritto, il retry è sicuro).
    var db = (window as any).db;
    var saveAll = function () {
      reordered.forEach(function (c: any) {
        fbSave(c);
      });
    };
    if (db && typeof db.batch === 'function') {
      try {
        var b = db.batch();
        reordered.forEach(function (c: any) {
          b.set(db.collection('cards').doc(String(c.id)), { ordine: c.ordine }, { merge: true });
        });
        b.commit().catch(function (err: any) {
          console.error('[useDragDrop] batch commit fallito, ritento per card:', err && err.code);
          saveAll();
        });
      } catch (err) {
        saveAll();
      }
    } else {
      saveAll();
    }
    dragId.current = null;
  }

  return {
    dragId: dragId,
    onDragStart: onDragStart,
    onDragEnd: onDragEnd,
    onDragOver: onDragOver,
    onDragLeave: onDragLeave,
    onDrop: onDrop,
  };
}

export default useDragDrop;
