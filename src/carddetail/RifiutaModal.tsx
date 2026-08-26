// RifiutaModal.tsx · ScuolaBoard · pannello estratto da CardDetail
var SB = window.SB || {};
var h = SB.h || React.createElement;

function RifiutaModal({ $, c }: any) {
  return (
    $.showRifiutaModal &&
    $.showRifiutaModal.id === c.id && (
      <div
        style={{
          background: '#1c1a2e',
          border: '1px solid rgba(239,68,68,.35)',
          borderRadius: 20,
          padding: 26,
          maxWidth: 360,
          width: '100%',
          margin: '0 auto 20px',
        }}
        onClick={function (e: any) {
          e.stopPropagation();
        }}
      >
        <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 8 }}>❌</div>
        <h3 style={{ margin: '0 0 4px', color: '#f87171', fontSize: 15, fontWeight: 800, textAlign: 'center' }}>
          Rifiuta proposta
        </h3>
        <p
          style={{
            color: 'rgba(255,255,255,.45)',
            fontSize: 12,
            marginBottom: 14,
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          {$.showRifiutaModal.titolo}
        </p>
        <label
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(255,255,255,.58)',
            letterSpacing: 1,
            display: 'block',
            marginBottom: 6,
          }}
        >
          MOTIVAZIONE (opzionale)
        </label>
        <textarea
          value={$.rifiutaInput}
          onInput={function (e: any) {
            $.setRifiutaInput(e.target.value);
          }}
          rows={3}
          placeholder="Es. Argomento già trattato, fuori tema…"
          style={{
            width: '100%',
            padding: '8px 10px',
            background: 'rgba(255,255,255,.06)',
            border: '1px solid rgba(255,255,255,.15)',
            borderRadius: 8,
            resize: 'vertical',
            marginBottom: 14,
            color: '#f1f5f9',
            fontSize: 12,
          }}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={function () {
              $.setShowRifiutaModal(null);
              $.setRifiutaInput('');
            }}
            style={{
              flex: 1,
              padding: 11,
              background: 'rgba(255,255,255,.08)',
              color: 'rgba(255,255,255,.6)',
              border: 'none',
              borderRadius: 11,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Annulla
          </button>
          <button
            onClick={function () {
              $.rifiutaConMot($.showRifiutaModal.id, $.rifiutaInput);
            }}
            style={{
              flex: 2,
              padding: 11,
              background: 'linear-gradient(135deg,#ef4444,#f87171)',
              color: '#fff',
              border: 'none',
              borderRadius: 11,
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            ❌ Rifiuta
          </button>
        </div>
      </div>
    )
  );
}
export default RifiutaModal;
