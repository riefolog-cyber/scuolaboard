// Toasts.jsx · ScuolaBoard

function Toasts__({ $ }: any) {
  if (!$.toasts || $.toasts.length === 0) return null;
  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {/* Il tetto (MAX_TOAST) sta nell'accodamento — src/utils/toast.ts, usato
          sia da useToast sia da AppProvider — non nel render: un toast tagliato
          solo a schermo resterebbe in memoria e, se porta "↩ Annulla",
          sarebbe un'azione invisibile. Qui si mostra tutto ciò che c'è. */}
      {$.toasts.map(function (t: any) {
        var icon = t.type === 'ok' ? '✅' : t.type === 'warn' ? '⚠️' : '❌';
        var msg = String(t.msg || '');
        var showIcon = msg.indexOf(icon) !== 0;
        return (
          <div
            key={t.id}
            className={'toast ' + t.type}
            role={t.type === 'err' ? 'alert' : 'status'}
            style={{ pointerEvents: 'auto' }}
          >
            {showIcon && <span className="toast-icon" aria-hidden="true">{icon}</span>}
            <span className="toast-msg">{msg}</span>
            {t.undo && (
              // L'id va passato: l'undo appartiene a QUESTA card, e una
              // eliminazione più recente non deve cambiare il bersaglio
              // (vedi src/undo-eliminazione.ts).
              <button
                type="button"
                className="toast-action"
                onClick={function () {
                  $.undoDeleteCard(t.id);
                }}
              >
                ↩ Annulla
              </button>
            )}
            {/* La ✕ solo dove serve davvero: WCAG 2.2.1 chiede un modo per
                chiudere un contenuto che RESTA (con TOAST_TIMEOUT_MS = 0
                nessun timer lo toglie). Il toast con undo invece lo chiude
                sempre il suo controllore (`UNDO_ELIMINAZIONE_MS`, 5s): non
                resta mai, quindi la ✕ non gli serve. E gli farebbe un danno:
                chiuderlo senza annullare lascerebbe partire la cancellazione
                della card senza più poterla revocare, e chiuderlo
                annullandola direbbe il contrario di quello che fa il ✕ di
                ogni altro toast. La sua unica uscita è «↩ Annulla» — o
                aspettare i 5s. */}
            {!t.undo && (
              <button
                type="button"
                className="toast-close"
                aria-label="Chiudi notifica"
                onClick={function () {
                  $.chiudiToast(t.id);
                }}
              >
                ✕
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
export default Toasts__;
