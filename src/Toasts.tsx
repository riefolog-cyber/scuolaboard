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
                className="toast-action"
                onClick={function () {
                  $.undoDeleteCard(t.id);
                }}
              >
                ↩ Annulla
              </button>
            )}
            {/* ✕ sempre presente: con TOAST_TIMEOUT_MS = 0 nessun timer chiude
                il toast, e senza un comando resterebbe sullo schermo per tutta
                la sessione (WCAG 2.2.1: un contenuto che resta va chiudibile). */}
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
          </div>
        );
      })}
    </div>
  );
}
export default Toasts__;
