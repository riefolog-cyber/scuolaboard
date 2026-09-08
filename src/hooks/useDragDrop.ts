// useDragDrop.ts · ScuolaBoard · hook drag & drop per il riordinamento delle
// card. Estratto da AppProvider per alleggerire il provider: riceve le card e
// la funzione di salvataggio come parametri, possiede il ref dragId.
// Il salvataggio del riordino usa un unico writeBatch (atomico) invece di N
// scritture separate.
//
// FIX drag & drop: prima il drop funzionava SOLO rilasciando la card SOPRA
// un'altra card. Nel layout a colonne (masonry) i vuoti tra le card sono ampi
// e rilasciare lì NON faceva nulla → la card tornava al punto di partenza
// ("non resta dove la metto"). Ora il CONTAINER gestisce dragover/drop:
// - durante il trascinamento un indicatore (riga) mostra ESATTAMENTE dove
//   atterrerà la card (prima/dopo la card più vicina al puntatore);
// - rilasciare in un vuoto inserisce la card prima/dopo la card più vicina
//   in base alla posizione del puntatore rispetto al suo centro.
import { useRef } from 'react';

// Riordinamento PURO e testabile: riordina l'INTERA lista dell'anno (non solo
// le card visibili) e ricompatta ordine a 1..N. Con un filtro classe attivo le
// card nascoste NON restano con ordine duplicati o stale: vengono riscritte in
// sequenza, e l'ordine relativo delle card visibili segue il drop dell'utente.
// `after` (opzionale, default false): inserisce fromId DOPO toId invece che
// prima. Ritorna [] se fromId/toId non sono nella lista (nessun salvataggio).
export function reorderCards(cards: any[], fromId: any, toId: any, after?: boolean): any[] {
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
  if (fi === ti) return []; // spostare una card prima/dopo se stessa = no-op
  var moved = arr.splice(fi, 1)[0];
  // after=false → inserisci nella posizione ORIGINALE del target (la card
  // trascinata prende il suo posto: semantica storica dell'e2e). Dopo lo
  // splice quell'indice può essere cambiato solo se fi < ti, quindi va
  // mantenuto ti (indice pre-rimozione).
  // after=true → "subito dopo toId": serve l'indice RICALCOLATO dopo la
  // rimozione (anche fine lista: splice accetta length).
  var ti2 = after ? arr.findIndex(function (c: any) {
    return String(c.id) === String(toId);
  }) + 1 : ti;
  arr.splice(ti2, 0, moved);
  return arr.map(function (c: any, i: number) {
    return Object.assign({}, c, { ordine: i + 1 });
  });
}

// Card sotto il puntatore: query sul container (.card-grid), come fa il resto
// della UI. id="card-<id>" è il contratto usato da CardItem.
function cardEls(): HTMLElement[] {
  return Array.prototype.slice.call(document.querySelectorAll('.card-grid [id^="card-"]')) as HTMLElement[];
}

function cardIdOf(el: HTMLElement): string {
  return el.id.replace('card-', '');
}

// Determina il punto di inserimento dal PUNTATORE (non dalla card sotto il
// cursore, che in un vuoto non esiste):
// 1. card sotto il puntatore → inserisci PRIMA di essa (semantica storica);
// 2. vuoto verticale nella stessa colonna → card più vicina verticalmente:
//    puntatore sopra il suo centro → PRIMA, sotto → DOPO;
// 3. sotto tutte le card (o fuori colonna) → appendi in coda alla lista.
// Ritorna { toId, after } oppure null se non ci sono card nel container.
export function computeDropTarget(e: any): { toId: string; after: boolean } | null {
  var x = e.clientX;
  var y = e.clientY;
  var els = cardEls();
  if (!els.length) return null;
  for (var i = 0; i < els.length; i++) {
    var r = els[i].getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
      return { toId: cardIdOf(els[i]), after: false };
    }
  }
  // Vuoto: prima le card della stessa colonna (x overlap), altrimenti tutte.
  var sameCol = els.filter(function (el) {
    var r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right;
  });
  var pool = sameCol.length ? sameCol : els;
  var best: any = null;
  var bestDist = Infinity;
  pool.forEach(function (el) {
    var r = el.getBoundingClientRect();
    var mid = r.top + r.height / 2;
    var d = Math.abs(mid - y);
    if (d < bestDist) {
      bestDist = d;
      best = { el: el, mid: mid };
    }
  });
  if (!best) return null;
  return { toId: cardIdOf(best.el), after: y > best.mid };
}

function clearDropIndicators() {
  document.querySelectorAll('.drop-before, .drop-after').forEach(function (el) {
    el.classList.remove('drop-before', 'drop-after');
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
    clearDropIndicators();
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

  // Salva il riordino in un unico writeBatch atomico (fallback a fbSave per
  // card se batch non disponibile o se il commit fallisce).
  function persistReorder(fromId: any, target: { toId: string; after: boolean } | null) {
    if (!fromId || !target) return;
    var reordered = reorderCards(cards, fromId, target.toId, target.after);
    if (!reordered.length) return;
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

  function onDrop(e: any, targetId: any) {
    e.preventDefault();
    clearDropIndicators();
    document.querySelectorAll('.drag-over').forEach(function (el) {
      el.classList.remove('drag-over');
    });
    var fromId = dragId.current;
    if (!fromId || String(fromId) === String(targetId)) return;
    persistReorder(fromId, { toId: targetId, after: false });
  }

  // ── HANDLER DI CONTAINER (vuoti tra le card) ─────────────────────────────
  // Senza questi, rilasciare nel GAP del layout a colonne non faceva nulla e
  // la card tornava al punto di partenza. Ora il container:
  // - preventDefault su dragover → il browser accetta il drop anche sui vuoti;
  // - durante il drag mostra l'indicatore di inserimento (prima/dopo);
  // - al drop calcola il punto di inserimento dal puntatore e salva.
  function onGridDragOver(e: any) {
    e.preventDefault();
    var t = computeDropTarget(e);
    clearDropIndicators();
    if (!t) return;
    var el = document.getElementById('card-' + t.toId);
    if (el) el.classList.add(t.after ? 'drop-after' : 'drop-before');
  }

  function onGridDrop(e: any) {
    e.preventDefault();
    clearDropIndicators();
    var fromId = dragId.current;
    if (!fromId) return;
    persistReorder(fromId, computeDropTarget(e));
  }

  return {
    dragId: dragId,
    onDragStart: onDragStart,
    onDragEnd: onDragEnd,
    onDragOver: onDragOver,
    onDragLeave: onDragLeave,
    onDrop: onDrop,
    onGridDragOver: onGridDragOver,
    onGridDrop: onGridDrop,
  };
}

export default useDragDrop;