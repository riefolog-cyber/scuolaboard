// focusTrap.tsx · ScuolaBoard · Fase 8b: trappola di focus per le modali.
// Avvolge il contenuto di una modale: il Tab resta dentro la modale (loop
// first↔last) e il focus iniziale viene portato dentro al mount. Al
// unmount il focus torna all'elemento che aveva aperto la modale.
// Il wrapper usa display:contents → nessun impatto sul layout.
import { useRef, useEffect } from 'react';

var FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusables(container: Element | null): HTMLElement[] {
  if (!container) return [];
  var nodes = container.querySelectorAll(FOCUSABLE_SELECTOR);
  var out: HTMLElement[] = [];
  for (var i = 0; i < nodes.length; i++) {
    var el = nodes[i] as HTMLElement;
    // Esclude elementi non visibili (display:none o dentro hidden)
    if (el.offsetParent !== null || el === document.activeElement) out.push(el);
  }
  return out;
}

function FocusTrap(props: any) {
  var wrapRef = useRef<HTMLDivElement | null>(null);
  useEffect(function () {
    var wrap = wrapRef.current;
    if (!wrap) return;
    var prevFocus = document.activeElement as HTMLElement | null;
    var focusables = getFocusables(wrap);
    if (focusables.length) {
      var first = focusables[0];
      if (!wrap.contains(document.activeElement)) {
        // Al mount porta il focus dentro la modale (con fallback se rAF manca)
        var move = function () {
          if (typeof first.focus === 'function') first.focus();
        };
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(move);
        else setTimeout(move, 0);
      }
    }
    function onKey(e: any) {
      if (!wrap) return;
      if (e.key !== 'Tab') return;
      // Guard anti-conflitto: se il focus è dentro un ALTRO FocusTrap (es. una
      // modale aperta sopra la CardDetail, che hanno trap separati), lascia
      // gestire il Tab a quel trap — altrimenti i due listener si "combattono"
      // e il focus verrebbe risucchiato fuori dalla modale a ogni Tab.
      var ae = document.activeElement;
      if (ae && typeof ae.closest === 'function') {
        var otherTrap = ae.closest('[data-focus-trap]');
        if (otherTrap && otherTrap !== wrap) return;
      }
      var els = getFocusables(wrap);
      if (!els.length) return;
      var firstEl = els[0];
      var lastEl = els[els.length - 1];
      if (e.shiftKey && (document.activeElement === firstEl || !wrap.contains(document.activeElement))) {
        e.preventDefault();
        if (typeof lastEl.focus === 'function') lastEl.focus();
      } else if (!e.shiftKey && (document.activeElement === lastEl || !wrap.contains(document.activeElement))) {
        e.preventDefault();
        if (typeof firstEl.focus === 'function') firstEl.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return function () {
      document.removeEventListener('keydown', onKey);
      if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus();
    };
  }, []);
  return (
    <div ref={wrapRef} data-focus-trap="" style={{ display: 'contents' }}>
      {props.children}
    </div>
  );
}

export default FocusTrap;
