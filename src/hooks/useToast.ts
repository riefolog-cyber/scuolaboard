// useToast.ts · ScuolaBoard · hook di dominio: toast globali
import { useState, useCallback } from 'react';

type Toast = { id: number; msg: string; type: string; undo?: boolean };

function useToast() {
  var [toasts, setToasts] = useState<Toast[]>([]);

  var showToast = useCallback(function (msg: string, type?: string) {
    var id = Date.now();
    setToasts(function (p: Toast[]) {
      return p.concat([{ id: id, msg: msg, type: type || 'ok' }]);
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
      setTimeout(function () {
        setToasts(function (p: Toast[]) {
          return p.filter(function (t: Toast) {
            return t.id !== id;
          });
        });
      }, durata);
    }
  }, []);

  // Espone il toast globalmente: fbSave/fbDel in app-utils lo usano come
  // safety-net centralizzato per mostrare gli errori di scrittura Firestore.
  if (window.SB) window.SB.showToast = showToast;

  return {
    toasts: toasts,
    setToasts: setToasts,
    showToast: showToast,
  };
}
export default useToast;
