// DomandeLiberePanel.tsx · ScuolaBoard · pannello estratto da CardDetail
var SB = window.SB || {};
var h = SB.h || React.createElement;
var Fragment = SB.Fragment || React.Fragment;

function DomandeLiberePanel({ $, c }: any) {
  return (
    <Fragment>
      {$.isProf && !$.simulaSt && $.cardQOpen[String(c.id)] && (
        <div
          style={{
            marginBottom: 14,
            background: 'rgba(99,102,241,.06)',
            border: '1px solid rgba(99,102,241,.2)',
            borderRadius: 10,
            padding: 12,
          }}
        >
          <textarea
            id="cm-textarea"
            value={$.cardQ}
            onInput={function (e: any) {
              $.setCardQ(e.target.value);
            }}
            rows={2}
            placeholder="Fai una domanda all'AI su questa lezione…"
            style={{
              width: '100%',
              padding: '8px 10px',
              background: 'rgba(0,0,0,.3)',
              border: '1px solid rgba(255,255,255,.15)',
              borderRadius: 8,
              fontSize: 12,
              color: '#f1f5f9',
              resize: 'vertical',
              marginBottom: 8,
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={function () {
                $.runCardQ(c);
              }}
              disabled={$.cardQLoad || !$.cardQ.trim()}
              style={{
                padding: '6px 14px',
                background: 'linear-gradient(135deg,#6366f1,#a855f7)',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                cursor: $.cardQLoad ? 'wait' : 'pointer',
              }}
            >
              {$.cardQLoad ? '⏳' : "🤖 Chiedi all'AI"}
            </button>
            <button
              onClick={function () {
                $.setCardQOpen(function (p: any) {
                  var n = Object.assign({}, p);
                  delete n[String(c.id)];
                  return n;
                });
                $.setCardQ('');
              }}
              style={{
                padding: '6px 14px',
                background: 'rgba(255,255,255,.06)',
                border: 'none',
                borderRadius: 8,
                color: 'rgba(255,255,255,.5)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Chiudi
            </button>
          </div>
          {$.cardQErr && <div style={{ color: '#f87171', fontSize: 11, marginTop: 6 }}>{$.cardQErr}</div>}
          {(function () {
            // Guardia: $.aiMap può essere undefined (refresha con undefined in
            // passato) → senza guardia la CardDetail crasha con
            // "Cannot read properties of undefined (reading '<cardId>')".
            var aiD = ($.aiMap && $.aiMap[String(c.id)]) || {};
            var domande = aiD && aiD.domande;
            if (!domande || !domande.length) return null;
            return (
              <div style={{ marginTop: 10 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,.45)', letterSpacing: 1 }}>
                    {"💬 DOMANDE ALL'AI (" + domande.length + ')'}
                  </span>
                  <button
                    onClick={function () {
                      if (!window.confirm("Eliminare la cronologia delle domande all'AI?")) return;
                      $.eliminaDomandeAI(c.id);
                    }}
                    title="Elimina la cronologia delle domande all'AI"
                    style={{
                      background: 'none',
                      border: '1px solid rgba(239,68,68,.35)',
                      borderRadius: 6,
                      padding: '1px 8px',
                      cursor: 'pointer',
                      fontSize: 11,
                      color: '#f87171',
                      fontWeight: 700,
                    }}
                  >
                    🗑️ Elimina domande
                  </button>
                </div>
                {domande.map(function (dq: any) {
                  return (
                    <div
                      key={dq.id}
                      style={{
                        background: 'rgba(99,102,241,.08)',
                        border: '1px solid rgba(99,102,241,.15)',
                        borderRadius: 8,
                        padding: '8px 12px',
                        marginBottom: 6,
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc', marginBottom: 4 }}>
                        ❓ {dq.q}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', lineHeight: 1.5 }}>
                        {dq.risposta}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
      {$.isProf && !$.simulaSt && !$.cardQOpen[String(c.id)] && (
        <button
          onClick={function () {
            $.setCardQOpen(function (p: any) {
              var n = Object.assign({}, p);
              n[String(c.id)] = true;
              return n;
            });
          }}
          style={{
            background: 'rgba(99,102,241,.1)',
            border: '1px solid rgba(99,102,241,.25)',
            borderRadius: 20,
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: 11,
            color: '#a5b4fc',
            fontWeight: 700,
            marginBottom: 12,
          }}
        >
          🤖 Fai una domanda all'AI
        </button>
      )}
    </Fragment>
  );
}
export default DomandeLiberePanel;
