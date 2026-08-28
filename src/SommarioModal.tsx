// SommarioModal.jsx · ScuolaBoard
var SB = window.SB || {};
var h = SB.h || React.createElement;

function SommarioModal__({ $ }: any) {
  var isLight = !!$.isLight;
  var [expanded, setExpanded] = (React as any).useState(false);
  // reset espansione quando cambia card
  var _showId = $.showSommario;
  ;(React as any).useEffect(function () { setExpanded(false); }, [_showId]);
  if (!$.showSommario) return null;
  var card = $.cards.find(function (c: any) {
    return String(c.id) === String($.showSommario);
  });
  if (!card) return null;
  var res = $.sommarioResult[$.showSommario];
  var loading = $.sommarioLoading === $.showSommario;
  return (
    <div
      onClick={function () {
        $.setShowSommario(null);
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: isLight ? 'rgba(15,23,42,.45)' : 'rgba(0,0,0,.8)',
        backdropFilter: 'blur(4px)',
        zIndex: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          background: isLight ? '#ffffff' : '#1c1a2e',
          border: isLight ? '1px solid rgba(15,23,42,.10)' : '1px solid rgba(34,197,94,.35)',
          borderRadius: 20,
          padding: 26,
          maxWidth: 500,
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: isLight ? '0 20px 60px rgba(15,23,42,.15)' : 'none',
        }}
        onClick={function (e: any) {
          e.stopPropagation();
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: '0 0 4px', color: isLight ? '#0f172a' : '#f1f5f9', fontSize: 15, fontWeight: 800 }}>
              📝 Riassunto discussione
            </h3>
            <p style={{ margin: 0, color: isLight ? '#64748b' : 'rgba(255,255,255,.45)', fontSize: 11 }}>
              {'"' + card.titolo + '" · ' + (card.commenti || []).length + ' commenti'}
            </p>
          </div>
          <button
            onClick={function () {
              $.riassuntiCommentiRun(card);
            }}
            disabled={loading}
            style={{
              background: 'rgba(34,197,94,.15)',
              border: '1px solid rgba(34,197,94,.3)',
              borderRadius: 8,
              padding: '4px 10px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 11,
              color: '#4ade80',
              fontWeight: 700,
            }}
          >
            {loading ? '⏳' : '↻ Rigenera'}
          </button>
        </div>
        {loading && (
          <div style={{ textAlign: 'center', padding: 30, color: isLight ? '#475569' : 'rgba(255,255,255,.58)' }}>
            <div style={{ fontSize: 28, animation: 'spin 1.5s linear infinite', display: 'inline-block' }}>⚙️</div>
            <div style={{ marginTop: 8, fontSize: 12 }}>Analisi in corso…</div>
          </div>
        )}
        {!loading && res && (function () {
          var isLong = String(res).length > 900;
          var text = !isLong || expanded ? res : String(res).slice(0, 900) + '…';
          return (
            <div>
              <div
                style={{
                  background: isLight ? 'rgba(34,197,94,.06)' : 'rgba(34,197,94,.07)',
                  border: isLight ? '1px solid rgba(34,197,94,.14)' : '1px solid rgba(34,197,94,.2)',
                  borderRadius: 12,
                  padding: '14px 16px',
                  fontSize: 13,
                  color: isLight ? '#1e293b' : 'rgba(255,255,255,.85)',
                  lineHeight: 1.8,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {text}
              </div>
              {isLong && (
                <button
                  onClick={function () {
                    setExpanded(function (v: any) { return !v; });
                  }}
                  style={{
                    marginTop: 8,
                    background: 'rgba(34,197,94,.12)',
                    border: '1px solid rgba(34,197,94,.28)',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontSize: 12,
                    color: '#4ade80',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {expanded ? '▲ Mostra meno' : '▼ Continua a leggere'}
                </button>
              )}
            </div>
          );
        })()}
        {!loading && res && (
          <div
            style={{
              marginTop: 10,
              paddingTop: 8,
              borderTop: isLight ? '1px solid rgba(15,23,42,.08)' : '1px solid rgba(34,197,94,.15)',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span style={{ fontSize: 10, color: isLight ? '#64748b' : 'rgba(255,255,255,.35)' }}>🤖</span>
            <span style={{ fontSize: 10, color: isLight ? '#64748b' : 'rgba(255,255,255,.35)', fontStyle: 'italic' }}>
              Generato con IA – revisionato dal docente
            </span>
          </div>
        )}
        {!loading && !res && (
          <div style={{ textAlign: 'center', color: isLight ? '#64748b' : 'rgba(255,255,255,.45)', padding: 20 }}>
            Clicca Rigenera per avviare l'analisi
          </div>
        )}
        <button
          onClick={function () {
            $.setShowSommario(null);
          }}
          style={{
            width: '100%',
            marginTop: 14,
            padding: 10,
            background: isLight ? 'rgba(15,23,42,.06)' : 'rgba(255,255,255,.08)',
            color: isLight ? '#334155' : 'rgba(255,255,255,.6)',
            border: isLight ? '1px solid rgba(15,23,42,.08)' : 'none',
            borderRadius: 11,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Chiudi
        </button>
      </div>
    </div>
  );
}
SB.SommarioModal = SommarioModal__;
export default SommarioModal__;
