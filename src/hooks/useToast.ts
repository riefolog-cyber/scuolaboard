// useToast.ts · ScuolaBoard · hook di dominio: toast globali
import { useState, useCallback, useEffect, useRef } from 'react';
import { aggiungiToast, nuovoIdToast } from '../utils/toast.ts';

type Toast = { id: number; msg: string; type: string; undo?: boolean };

function useToast() {
  var [toasts, setToasts] = useState<Toast[]>([]);
  // Un timer di auto-chiusura per toast, per POTERLO SPEGNERE. Prima il timer
  // restava in volo anche su un toast già chiuso (la ✕) e, allo smontaggio
  // dell'app (logout, cambio account), aggiornava lo stato di un componente
  // che non c'era più. Il filtro per id rendeva il difetto invisibile, non
  // inesistente: è il tipo di residuo che poi si somma.
  var timers = useRef<Map<number, any>>(new Map());

  /** Toglie un toast per id e ne ferma il timer: unico punto di rimozione. */
  var chiudiToast = useCallback(function (id: number) {
    var timer = timers.current.get(id);
    if (timer != null) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts(function (p: Toast[]) {
      return p.filter(function (t: Toast) {
        return t.id !== id;
      });
    });
  }, []);

  var showToast = useCallback(function (msg: string, type?: string) {
    // Id da un contatore, non `Date.now()`: due toast nello stesso millisecondo
    // avrebbero lo stesso id (chiave React duplicata e chiusura di ENTRAMBI,
    // perché la rimozione è per id).
    var id = nuovoIdToast();
    // Accodamento con tetto (`MAX_TOAST` in utils/toast.ts): il taglio sta qui e
    // non nel render, altrimenti il toast tagliato resta in memoria e — se porta
    // "↩ Annulla" — l'azione sparisce dallo schermo restando in sospeso.
    setToasts(function (p: Toast[]) {
      return aggiungiToast(p, { id: id, msg: msg, type: type || 'ok' });
    });
    // Unica fonte di verità: `SB_CONFIG.TOAST_TIMEOUT_MS` (app-state.ts). Il
    // letterale 2400 resta solo come fallback nei test che non fanno il boot.
    var cfg: any = (window as any).SB_CONFIG;
    // `0` significa "nessuna auto-chiusura": non si usa `||` (lo sostituiva con
    // 2400) e non si schedula alcun timer. NaN/Infinity cadono sul fallback.
    var configurata = cfg && typeof cfg.TOAST_TIMEOUT_MS === 'number' ? cfg.TOAST_TIMEOUT_MS : 2400;
    // Valori invalidi (NaN, Infinity, negativi) tornano al default: un negativo
    // prima veniva clampato a 0 dal browser (chiusura immediata), ora diventerebbe
    // "persistente" — meglio dichiararlo esplicitamente invalido.
    var durata = Number.isFinite(configurata) && configurata >= 0 ? configurata : 2400;
    if (durata > 0) {
      var timer = setTimeout(function () {
        // Il timer ha finito: la voce esce dalla mappa. Se nel frattempo il toast
        // è stato chiuso a mano, `chiudiToast` l'ha già tolta (e l'ha anche
        // fermato, quindi qui non si passa).
        timers.current.delete(id);
        setToasts(function (p: Toast[]) {
          return p.filter(function (t: Toast) {
            return t.id !== id;
          });
        });
      }, durata);
      timers.current.set(id, timer);
    }
  }, []);

  // Smontaggio: nessun timer orfano, quindi nessun aggiornamento di stato su un
  // componente che non esiste più. La mappa si svuota, non si "azzera il campo":
  // il ref è la stessa istanza anche dopo un rimontaggio.
  useEffect(function () {
    var mappa = timers.current;
    return function () {
      mappa.forEach(function (timer) {
        clearTimeout(timer);
      });
      mappa.clear();
    };
  }, []);

  // Espone il toast globalmente: fbSave/fbDel in app-utils lo usano come
  // safety-net centralizzato per mostrare gli errori di scrittura Firestore.
  // In un effetto e non nel corpo del render: assegnare a `window` durante il
  // render è un effetto collaterale (React può renderizzare due volte o scartare
  // il render); nel frattempo vale il fallback definito in app-state.ts.
  useEffect(function () {
    if (window.SB) window.SB.showToast = showToast;
  }, [showToast]);

  return {
    toasts: toasts,
    setToasts: setToasts,
    showToast: showToast,
    chiudiToast: chiudiToast,
  };
}
export default useToast;
