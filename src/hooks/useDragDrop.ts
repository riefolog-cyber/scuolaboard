// useDragDrop.ts · ScuolaBoard · hook drag & drop per il riordinamento delle
// card. Estratto da AppProvider per alleggerire il provider: riceve le card e
// la funzione di salvataggio come parametri, possiede il ref dragId.
import { useRef } from 'react';

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
    var arr = cards.slice().sort(function (a: any, b: any) {
      return (a.ordine || 0) - (b.ordine || 0);
    });
    var fi = arr.findIndex(function (c: any) {
      return String(c.id) === String(fromId);
    });
    var ti = arr.findIndex(function (c: any) {
      return String(c.id) === String(targetId);
    });
    if (fi < 0 || ti < 0) return;
    var moved = arr.splice(fi, 1)[0];
    arr.splice(ti, 0, moved);
    arr.forEach(function (c: any, i: number) {
      fbSave(Object.assign({}, c, { ordine: i + 1 }));
    });
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
