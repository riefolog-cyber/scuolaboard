// AIPanel.tsx · ScuolaBoard · pannello estratto da CardDetail
var SB = window.SB || {};
var h = SB.h || React.createElement;
var Fragment = SB.Fragment || React.Fragment;

function AIPanel({ $, c }) {
  var aiD = ($.aiMap && $.aiMap[String(c.id)]) || {};
  var cRes = c.aiAnalisi || (aiD && aiD.analisi);
  var manuallyClosed = $.cardAiOpen === 'closed_' + String(c.id);
  var manuallyOpen = $.cardAiOpen === String(c.id);
  var cOpen = manuallyOpen && !manuallyClosed;
  var cLoad = $.cardAiLoad === c.id;
  var isStudent = !$.isProf || $.simulaSt;
  return (
    <Fragment>
      {(($.isProf && !$.simulaSt && cOpen) || (isStudent && cRes && cOpen)) && (
                  <div
                    className="ai-panel open"
                    style={{
                      borderTop: '1px solid rgba(99,102,241,.25)',
                      background: 'rgba(30,30,60,.7)',
                      padding: '10px 14px',
                      marginBottom: 14,
                      borderRadius: 10,
                    }}
                  >
                    {cLoad && (
                      <div style={{ textAlign: 'center', padding: '8px 0', color: 'rgba(255,255,255,.58)', fontSize: 12 }}>
                        ⚙️ Analisi in corso…
                      </div>
                    )}
                    {!cLoad && cRes && $.isProf && !$.simulaSt && (
                      <>
                        <div
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}
                        >
                          {(function () {
                            var lastAnalisi = cRes.data ? new Date(cRes.data).getTime() : 0;
                            var newCount = (c.commenti || []).filter(function (cm) {
                              return new Date(cm.data || 0).getTime() > lastAnalisi;
                            }).length;
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,.40)' }}>
                                  Aggiornata il {$.fmtDT(cRes.data)}
                                </span>
                                {newCount > 0 && (
                                  <span
                                    style={{
                                      background: 'rgba(245,158,11,.2)',
                                      color: '#fbbf24',
                                      borderRadius: 20,
                                      padding: '1px 7px',
                                      fontSize: 11,
                                      fontWeight: 800,
                                      border: '1px solid rgba(245,158,11,.3)',
                                    }}
                                  >
                                    {'⚠️ ' + newCount + ' nuovi comm.'}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <button
                              onClick={function () {
                                $.runCardAI(c, $.cards, null);
                              }}
                              style={{
                                background: 'none',
                                border: '1px solid rgba(99,102,241,.3)',
                                borderRadius: 6,
                                padding: '1px 8px',
                                cursor: 'pointer',
                                fontSize: 11,
                                color: 'rgba(99,102,241,.7)',
                                fontWeight: 700,
                              }}
                            >
                              ↻ Rigenera
                            </button>
                            <button
                              onClick={function (e) {
                                e.stopPropagation();
                                if (!window.confirm('Eliminare l\'analisi AI di questa card?')) return;
                                $.eliminaAnalisiAI(c.id);
                              }}
                              title="Elimina l'analisi AI"
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
                              🗑️ Elimina analisi
                            </button>
                          </div>
                        </div>
                        {cRes.sintesi && (
                          <div style={{ marginBottom: 8 }}>
                            <div
                              style={{ fontSize: 11, fontWeight: 800, color: '#a5b4fc', letterSpacing: 1, marginBottom: 3 }}
                            >
                              📋 SINTESI
                            </div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.8)', lineHeight: 1.6 }}>{cRes.sintesi}</div>
                          </div>
                        )}
                        {cRes.dinamica && (
                          <div style={{ marginBottom: 8 }}>
                            <div
                              style={{ fontSize: 11, fontWeight: 800, color: '#93c5fd', letterSpacing: 1, marginBottom: 3 }}
                            >
                              💬 DINAMICA
                            </div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.75)', lineHeight: 1.6 }}>
                              {cRes.dinamica}
                            </div>
                          </div>
                        )}
                        {cRes.spunto && (
                          <div
                            style={{
                              background: 'rgba(34,197,94,.08)',
                              borderRadius: 7,
                              padding: '7px 10px',
                              border: '1px solid rgba(34,197,94,.15)',
                              marginBottom: 8,
                            }}
                          >
                            <div
                              style={{ fontSize: 11, fontWeight: 800, color: '#4ade80', letterSpacing: 1, marginBottom: 3 }}
                            >
                              💡 SPUNTO DIDATTICO
                            </div>
                            <div
                              style={{ fontSize: 11, color: 'rgba(255,255,255,.8)', lineHeight: 1.6, fontStyle: 'italic' }}
                            >
                              {cRes.spunto}
                            </div>
                          </div>
                        )}
                        {cRes.domande_stimolo && cRes.domande_stimolo.length > 0 && (
                          <div style={{ marginBottom: 4 }}>
                            <div
                              style={{ fontSize: 11, fontWeight: 800, color: '#a5b4fc', letterSpacing: 0.5, marginBottom: 6 }}
                            >
                              💭 SPUNTI PER RIFLETTERE{' '}
                              <span style={{ color: 'rgba(255,255,255,.42)', fontWeight: 600 }}>· visibili agli studenti</span>
                            </div>
                            {cRes.domande_stimolo.map(function (d, i) {
                              return (
                                <div
                                  key={i}
                                  style={{ display: 'flex', gap: 6, marginBottom: 5, alignItems: 'flex-start' }}
                                >
                                  <span
                                    style={{
                                      background: '#6366f1',
                                      color: '#fff',
                                      borderRadius: '50%',
                                      width: 18,
                                      height: 18,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: 10,
                                      fontWeight: 800,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {i + 1}
                                  </span>
                                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', lineHeight: 1.5 }}>{d}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                    {!cLoad && cRes && isStudent && (
                      <>
                        {cRes.sintesi && (
                          <div style={{ marginBottom: 8 }}>
                            <div
                              style={{ fontSize: 11, fontWeight: 800, color: '#a5b4fc', letterSpacing: 1, marginBottom: 3 }}
                            >
                              📋 SINTESI
                            </div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.8)', lineHeight: 1.6 }}>{cRes.sintesi}</div>
                          </div>
                        )}
                        {cRes.dinamica && (
                          <div style={{ marginBottom: 8 }}>
                            <div
                              style={{ fontSize: 11, fontWeight: 800, color: '#93c5fd', letterSpacing: 1, marginBottom: 3 }}
                            >
                              💬 DINAMICA
                            </div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.75)', lineHeight: 1.6 }}>
                              {cRes.dinamica}
                            </div>
                          </div>
                        )}
                        {cRes.spunto && (
                          <div
                            style={{
                              background: 'rgba(34,197,94,.08)',
                              borderRadius: 7,
                              padding: '7px 10px',
                              border: '1px solid rgba(34,197,94,.15)',
                              marginBottom: 8,
                            }}
                          >
                            <div
                              style={{ fontSize: 11, fontWeight: 800, color: '#4ade80', letterSpacing: 1, marginBottom: 3 }}
                            >
                              💡 SPUNTO DIDATTICO
                            </div>
                            <div
                              style={{ fontSize: 11, color: 'rgba(255,255,255,.8)', lineHeight: 1.6, fontStyle: 'italic' }}
                            >
                              {cRes.spunto}
                            </div>
                          </div>
                        )}
                        {cRes.domande_stimolo && cRes.domande_stimolo.length > 0 && (
                          <div style={{ marginBottom: 4 }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#a5b4fc', letterSpacing: 0.5, marginBottom: 6 }}>
                              💭 SPUNTI PER RIFLETTERE
                            </div>
                            {cRes.domande_stimolo.map(function (d, i) {
                              return (
                                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 5, alignItems: 'flex-start' }}>
                                  <span
                                    style={{
                                      background: '#6366f1',
                                      color: '#fff',
                                      borderRadius: '50%',
                                      width: 18,
                                      height: 18,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: 10,
                                      fontWeight: 800,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {i + 1}
                                  </span>
                                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', lineHeight: 1.5 }}>{d}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {$.isProf && !$.simulaSt && (
                    <button
                      onClick={function (e) {
                        e.stopPropagation();
                        if (cRes) {
                          $.setCardAiOpen(cOpen ? 'closed_' + String(c.id) : String(c.id));
                        } else {
                          $.runCardAI(c, $.cards, null);
                        }
                      }}
                      style={{
                        background: cOpen ? 'rgba(99,102,241,.45)' : cRes ? 'rgba(99,102,241,.22)' : 'rgba(99,102,241,.12)',
                        border: '1px solid rgba(99,102,241,' + (cOpen ? '.6' : cRes ? '.45' : '.3') + ')',
                        borderRadius: 20,
                        padding: '4px 12px',
                        cursor: 'pointer',
                        fontSize: 11,
                        color: '#a5b4fc',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {cLoad ? '⚙️ …' : '🤖 ' + (cRes ? (cOpen ? '▲ chiudi' : '▼ AI') : '+ AI')}
                    </button>
                  )}
                  {isStudent && cRes && (
                    <button
                      onClick={function (e) {
                        e.stopPropagation();
                        $.setCardAiOpen(cOpen ? 'closed_' + String(c.id) : String(c.id));
                      }}
                      style={{
                        background: cOpen ? 'rgba(99,102,241,.35)' : 'rgba(99,102,241,.12)',
                        border: '1px solid rgba(99,102,241,.35)',
                        borderRadius: 20,
                        padding: '4px 12px',
                        cursor: 'pointer',
                        fontSize: 11,
                        color: '#a5b4fc',
                        fontWeight: 700,
                      }}
                    >
                      {'🤖 ' + (cOpen ? '▲ chiudi' : '▼ Analisi AI')}
                    </button>
                  )}
                </div>
    </Fragment>
  );
}
export default AIPanel;
