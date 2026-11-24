// Toasts.jsx · ScuolaBoard

function Toasts__({ $ }: any) {
  if (!$.toasts || $.toasts.length === 0) return null;
  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {/* Con TOAST_TIMEOUT_MS=0 non c'è auto-chiusura: un cap evita che l'array
          cresca senza limite in una sessione lunga. I più recenti restano. */}
      {$.toasts.slice(-5).map(function (t: any) {
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
              <button className="toast-action" onClick={$.undoDeleteCard}>
                ↩ Annulla
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
export default Toasts__;
