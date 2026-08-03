// CommentsSection.tsx · ScuolaBoard · pannello estratto da CardDetail
var SB = window.SB || {};
var h = SB.h || React.createElement;
var Fragment = SB.Fragment || React.Fragment;

function CommentsSection({ $, c }) {
  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: 'rgba(255,255,255,.8)' }}>
                  💬 Commenti ({(c.commenti || []).length})
                </span>
                {$.isProf && !$.simulaSt && (c.commenti || []).length >= 2 && (
                  <button
                    onClick={function (e) {
                      e.stopPropagation();
                      $.setShowSommario(c.id);
                      if (!$.sommarioResult[c.id]) $.riassuntiCommentiRun(c);
                    }}
                    style={{
                      background: 'rgba(34,197,94,.12)',
                      border: '1px solid rgba(34,197,94,.3)',
                      borderRadius: 20,
                      padding: '3px 9px',
                      cursor: 'pointer',
                      fontSize: 11,
                      color: '#4ade80',
                      fontWeight: 700,
                    }}
                  >
                    📝 Riassumi
                  </button>
                )}
              </div>
    
              {/* Comment list */}
              {c.commenti && c.commenti.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  {c.commenti.map(function (cm, i) {
                    return (
                      <div
                        key={cm.id || i}
                        style={{
                          background: 'rgba(255,255,255,.03)',
                          border: '1px solid rgba(255,255,255,.06)',
                          borderRadius: 10,
                          padding: '8px 12px',
                          marginBottom: 6,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 4,
                          }}
                        >
                          <span style={{ fontWeight: 700, fontSize: 12, color: '#a5b4fc' }}>{cm.autore || 'Anonimo'}</span>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>{$.timeAgo(cm.data)}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', lineHeight: 1.5 }}>{cm.testo}</div>
                        {$.isProf && !$.simulaSt && (
                          <button
                            onClick={function (e) {
                              e.stopPropagation();
                              $.setShowAmm({ autore: cm.autore, cardId: c.id, cmId: cm.id });
                            }}
                            style={{
                              marginTop: 4,
                              background: 'none',
                              border: 'none',
                              color: 'rgba(255,255,255,.35)',
                              cursor: 'pointer',
                              fontSize: 10,
                            }}
                          >
                            ⚠️ Ammonisci
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {(!c.commenti || c.commenti.length === 0) && (
                <div style={{ textAlign: 'center', padding: 16, color: 'rgba(255,255,255,.35)', fontSize: 12 }}>
                  Nessun commento. Scrivi il primo!
                </div>
              )}
    
              {/* Comment input */}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={$.nc.testo || ''}
                  onInput={function (e) {
                    $.setNc({ testo: e.target.value });
                  }}
                  onKeyDown={function (e) {
                    if (e.key === 'Enter') $.addCom(c.id);
                  }}
                  placeholder="Scrivi un commento…"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,.06)',
                    border: '1px solid rgba(255,255,255,.12)',
                    borderRadius: 10,
                    fontSize: 12,
                    color: '#f1f5f9',
                  }}
                />
                <button
                  onClick={function () {
                    $.addCom(c.id);
                  }}
                  disabled={!($.nc.testo || '').trim()}
                  style={{
                    padding: '8px 16px',
                    background: $.nc.testo && $.nc.testo.trim() ? 'linear-gradient(135deg,#6366f1,#a855f7)' : 'rgba(255,255,255,.08)',
                    border: 'none',
                    borderRadius: 10,
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: $.nc.testo && $.nc.testo.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Invia
                </button>
              </div>
            </div>
  );
}
export default CommentsSection;
