// SommarioModal.jsx · ScuolaBoard
var SB = window.SB || {};
var h = SB.h || React.createElement;

function SommarioModal__({ $ }: any) {
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
        background: 'rgba(0,0,0,.8)',
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
          background: '#1c1a2e',
          border: '1px solid rgba(34,197,94,.35)',
          borderRadius: 20,
          padding: 26,
          maxWidth: 500,
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
        onClick={function (e: any) {
          e.stopPropagation();
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: '0 0 4px', color: '#f1f5f9', fontSize: 15, fontWeight: 800 }}>
              📝 Riassunto discussione
            </h3>
            <p style={{ margin: 0, color: 'rgba(255,255,255,.45)', fontSize: 11 }}>
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
          <div style={{ textAlign: 'center', padding: 30, color: 'rgba(255,255,255,.58)' }}>
            <div style={{ fontSize: 28, animation: 'spin 1.5s linear infinite', display: 'inline-block' }}>⚙️</div>
            <div style={{ marginTop: 8, fontSize: 12 }}>Analisi in corso…</div>
          </div>
        )}
        {!loading && res && (
          <div
            style={{
              background: 'rgba(34,197,94,.07)',
              border: '1px solid rgba(34,197,94,.2)',
              borderRadius: 12,
              padding: '14px 16px',
              fontSize: 13,
              color: 'rgba(255,255,255,.85)',
              lineHeight: 1.8,
              whiteSpace: 'pre-wrap',
            }}
          >
            {res}
          </div>
        )}
        {!loading && res && (
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(34,197,94,.15)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>🤖</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', fontStyle: 'italic' }}>Generato con IA – revisionato dal docente</span>
          </div>
        )}
        {!loading && !res && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.45)', padding: 20 }}>
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
            background: 'rgba(255,255,255,.08)',
            color: 'rgba(255,255,255,.6)',
            border: 'none',
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
