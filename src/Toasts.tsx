// Toasts.jsx · ScuolaBoard

function Toasts__({ $ }: any) {
  if (!$.toasts || $.toasts.length === 0) return null;
  return (
    <div className="toast-container">
      {$.toasts.map(function (t: any) {
        var icon = t.type === 'ok' ? '✅' : t.type === 'warn' ? '⚠️' : '❌';
        return (
          <div
            key={t.id}
            className={'toast ' + t.type}
            style={{ display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'auto' }}
          >
            {icon} {t.msg}
            {t.undo && (
              <button
                onClick={$.undoDeleteCard}
                style={{
                  background: 'rgba(255,255,255,.25)',
                  border: 'none',
                  borderRadius: 6,
                  padding: '2px 9px',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#fff',
                  marginLeft: 4,
                }}
              >
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
