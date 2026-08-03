// AiQuizGenModal.tsx  ·  estratto da Modals.tsx (split Fase 2a)
var SB = window.SB || {};
window.SB = SB;
var h = SB.h || React.createElement;
var Fragment = SB.Fragment || React.Fragment;

function AiQuizGenModal(props) {
  if (!props.showAiQuizGen) return null;
  var S = props.S || window.S || {};
  var aqg = props.aqg || {};
  var setAqg = props.setAqg;
  function saqg(patch) {
    setAqg(function (p) {
      return Object.assign({}, p, patch);
    });
  }
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.88)',
        zIndex: 700,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0',
      }}
      onClick={function () {
        if (!aqg.loading) {
          props.setShowAiQuizGen(false);
        }
      }}
    >
      {
        <div
          style={{
            background: '#0f172a',
            borderRadius: '20px 20px 0 0',
            padding: 24,
            width: '100%',
            maxWidth: 580,
            maxHeight: '92vh',
            overflowY: 'auto',
            border: '1px solid rgba(99,102,241,.3)',
            borderBottom: 'none',
          }}
          onClick={function (e) {
            e.stopPropagation();
          }}
        >
          {
            <div
              style={{
                width: 32,
                height: 3,
                background: 'rgba(255,255,255,.15)',
                borderRadius: 4,
                margin: '0 auto 16px',
              }}
            />
          }
          {
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              {
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  ✨
                </div>
              }
              {
                <div>
                  {<div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 15 }}>Genera Quiz con AI</div>}
                  {
                    <div style={{ color: 'rgba(255,255,255,.58)', fontSize: 11 }}>
                      {aqg.anteprima
                        ? 'Anteprima — modifica o rigenera'
                        : 'Incolla un testo, scegli il tipo e il numero di domande'}
                    </div>
                  }
                </div>
              }
              {!aqg.loading && (
                <button
                  aria-label="Chiudi generatore quiz"
                  onClick={function () {
                    props.setShowAiQuizGen(false);
                  }}
                  style={{
                    marginLeft: 'auto',
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,.45)',
                    fontSize: 20,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  ×
                </button>
              )}
            </div>
          }
          {!aqg.anteprima && (
            <>
              {
                <textarea
                  value={aqg.testo}
                  aria-label="Testo sorgente per generare il quiz"
                  onInput={function (e) {
                    saqg({ testo: e.target.value });
                  }}
                  rows={7}
                  placeholder="Incolla qui il testo sorgente: capitolo del libro, articolo, appunti di lezione…"
                  style={Object.assign({}, S.input, {
                    resize: 'vertical',
                    marginBottom: 12,
                    fontSize: 12,
                    lineHeight: 1.65,
                  })}
                />
              }
              {
                <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                  {
                    <div style={{ flex: 2, minWidth: 160 }}>
                      {
                        <label className="u-label" style={{ display: 'block', marginBottom: 6 }}>
                          TIPO DI DOMANDE
                        </label>
                      }
                      {
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                          {[
                            { v: 'multipla', i: '🔘', l: 'Scelta multipla' },
                            { v: 'verofalso', i: '☑️', l: 'Vero / Falso' },
                            { v: 'aperta', i: '✍️', l: 'Risposta aperta' },
                            { v: 'misto', i: '🔀', l: 'Misto' },
                          ].map(function (t) {
                            var sel = aqg.tipo === t.v;
                            return (
                              <button
                                key={t.v}
                                onClick={function () {
                                  saqg({ tipo: t.v });
                                }}
                                style={{
                                  padding: '7px 8px',
                                  border: '1px solid ' + (sel ? '#6366f1' : 'rgba(255,255,255,.1)'),
                                  borderRadius: 8,
                                  background: sel ? 'rgba(99,102,241,.25)' : 'rgba(255,255,255,.04)',
                                  color: sel ? '#c4b5fd' : 'rgba(255,255,255,.65)',
                                  fontSize: 11,
                                  fontWeight: sel ? 800 : 500,
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                              >
                                {t.i + ' ' + t.l}
                              </button>
                            );
                          })}
                        </div>
                      }
                    </div>
                  }
                  {
                    <div style={{ flex: 1, minWidth: 100 }}>
                      {
                        <label className="u-label" style={{ display: 'block', marginBottom: 6 }}>
                          N° DOMANDE
                        </label>
                      }
                      {
                        <input
                          type="number"
                          min={1}
                          max={10}
                          aria-label="Numero di domande"
                          value={aqg.numDom}
                          onInput={function (e) {
                            var v = Math.max(1, Math.min(10, parseInt(e.target.value) || 4));
                            saqg({ numDom: v });
                          }}
                          style={Object.assign({}, S.input, {
                            fontSize: 22,
                            fontWeight: 800,
                            textAlign: 'center',
                            padding: '10px 8px',
                            height: 72,
                            color: '#c4b5fd',
                          })}
                        />
                      }
                      {
                        <div
                          style={{ fontSize: 11, color: 'rgba(255,255,255,.40)', textAlign: 'center', marginTop: 3 }}
                        >
                          min 1 — max 10
                        </div>
                      }
                    </div>
                  }
                </div>
              }
              {aqg.err && (
                <div
                  style={{
                    background: 'rgba(239,68,68,.1)',
                    border: '1px solid rgba(239,68,68,.3)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    color: '#f87171',
                    fontSize: 12,
                    marginBottom: 10,
                  }}
                >
                  {aqg.err}
                </div>
              )}
              {
                <div style={{ display: 'flex', gap: 8 }}>
                  {
                    <button
                      onClick={function () {
                        props.setShowAiQuizGen(false);
                      }}
                      style={{
                        flex: 1,
                        padding: 11,
                        background: 'rgba(255,255,255,.07)',
                        color: 'rgba(255,255,255,.65)',
                        border: 'none',
                        borderRadius: 11,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Annulla
                    </button>
                  }
                  {
                    <button
                      onClick={props.aiGeneraQuiz}
                      disabled={aqg.loading || !aqg.testo.trim()}
                      style={{
                        flex: 2,
                        padding: 11,
                        background:
                          aqg.loading || !aqg.testo.trim()
                            ? 'rgba(255,255,255,.08)'
                            : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                        color: aqg.loading || !aqg.testo.trim() ? 'rgba(255,255,255,.40)' : '#fff',
                        border: 'none',
                        borderRadius: 11,
                        fontSize: 14,
                        fontWeight: 800,
                        cursor: aqg.loading || !aqg.testo.trim() ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      {aqg.loading ? (
                        <>
                          {<span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⚙️</span>}{' '}
                          Generazione in corso…
                        </>
                      ) : (
                        '✨ Genera ' + aqg.numDom + ' domande'
                      )}
                    </button>
                  }
                </div>
              }
            </>
          )}
          {aqg.anteprima && (
            <>
              {
                <div
                  style={{
                    background: 'rgba(34,197,94,.08)',
                    border: '1px solid rgba(34,197,94,.2)',
                    borderRadius: 9,
                    padding: '8px 12px',
                    marginBottom: 14,
                    fontSize: 12,
                    color: '#4ade80',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  ✅ Generate {<strong>{aqg.anteprima.length}</strong>} domande — controlla, modifica o rigenera singole
                  domande, poi conferma.
                </div>
              }
              {aqg.anteprima.map(function (d, i) {
                var isRegen = aqg.regenIdx === i;
                var tipoBadgeBg = d.tipo === 'multipla' ? '#6366f1' : d.tipo === 'verofalso' ? '#22c55e' : '#f59e0b';
                var tipoLabel = d.tipo === 'multipla' ? 'Multipla' : d.tipo === 'verofalso' ? 'Vero/Falso' : 'Aperta';
                return (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(255,255,255,.04)',
                      border: '1px solid rgba(99,102,241,.2)',
                      borderRadius: 11,
                      padding: '11px 13px',
                      marginBottom: 8,
                      opacity: isRegen ? 0.5 : 1,
                    }}
                  >
                    {
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                        {
                          <span
                            style={{
                              background: '#6366f1',
                              color: '#fff',
                              borderRadius: '50%',
                              width: 20,
                              height: 20,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 11,
                              fontWeight: 800,
                              flexShrink: 0,
                            }}
                          >
                            {i + 1}
                          </span>
                        }
                        {
                          <span
                            style={{
                              background: tipoBadgeBg + '33',
                              color: tipoBadgeBg,
                              borderRadius: 6,
                              padding: '1px 7px',
                              fontSize: 11,
                              fontWeight: 700,
                              border: '1px solid ' + tipoBadgeBg + '55',
                            }}
                          >
                            {tipoLabel}
                          </span>
                        }
                        {<div style={{ flex: 1 }} />}
                        {
                          <button
                            onClick={function () {
                              props.aiRigenDomanda(i);
                            }}
                            disabled={isRegen || aqg.regenIdx !== null}
                            title="Rigenera questa domanda"
                            style={{
                              background: 'rgba(99,102,241,.15)',
                              border: '1px solid rgba(99,102,241,.3)',
                              borderRadius: 7,
                              padding: '3px 8px',
                              cursor: isRegen || aqg.regenIdx !== null ? 'not-allowed' : 'pointer',
                              fontSize: 11,
                              color: '#a5b4fc',
                              fontWeight: 700,
                            }}
                          >
                            {isRegen ? '⏳' : '↻ Rigenera'}
                          </button>
                        }
                      </div>
                    }
                    {
                      <div
                        style={{
                          fontSize: 13,
                          color: 'rgba(255,255,255,.9)',
                          lineHeight: 1.6,
                          marginBottom: d.tipo !== 'aperta' ? 8 : 0,
                          fontWeight: 600,
                        }}
                      >
                        {d.testo}
                      </div>
                    }
                    {d.tipo === 'multipla' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {d.opzioni.map(function (op, j) {
                          var isCorr = String(d.corretta) === String(j);
                          return (
                            <div
                              key={j}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 7,
                                background: isCorr ? 'rgba(34,197,94,.1)' : 'rgba(255,255,255,.03)',
                                borderRadius: 7,
                                padding: '5px 9px',
                                border: '1px solid ' + (isCorr ? 'rgba(34,197,94,.3)' : 'rgba(255,255,255,.07)'),
                              }}
                            >
                              {
                                <span
                                  style={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: '50%',
                                    border: '2px solid ' + (isCorr ? '#22c55e' : 'rgba(255,255,255,.2)'),
                                    background: isCorr ? '#22c55e' : 'transparent',
                                    flexShrink: 0,
                                  }}
                                />
                              }
                              {
                                <span style={{ fontSize: 12, color: isCorr ? '#4ade80' : 'rgba(255,255,255,.65)' }}>
                                  {op}
                                </span>
                              }
                              {isCorr && (
                                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#4ade80', fontWeight: 700 }}>
                                  ✓ corretta
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {d.tipo === 'verofalso' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        {['Vero', 'Falso'].map(function (vf) {
                          var isCorr = d.corretta === vf;
                          return (
                            <div
                              key={vf}
                              style={{
                                flex: 1,
                                padding: '6px 10px',
                                borderRadius: 8,
                                border: '1px solid ' + (isCorr ? 'rgba(34,197,94,.4)' : 'rgba(255,255,255,.1)'),
                                background: isCorr ? 'rgba(34,197,94,.1)' : 'rgba(255,255,255,.03)',
                                color: isCorr ? '#4ade80' : 'rgba(255,255,255,.58)',
                                fontSize: 12,
                                fontWeight: isCorr ? 800 : 400,
                                textAlign: 'center',
                              }}
                            >
                              {vf + (isCorr ? ' ✓' : '')}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {d.tipo === 'aperta' && (
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.52)', fontStyle: 'italic' }}>
                        ✨ Risposta libera — valutata dall'AI al momento della correzione
                      </div>
                    )}
                  </div>
                );
              })}
              {
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    marginTop: 6,
                    paddingTop: 14,
                    borderTop: '1px solid rgba(255,255,255,.07)',
                  }}
                >
                  {
                    <button
                      onClick={function () {
                        saqg({ anteprima: null });
                      }}
                      style={{
                        flex: 1,
                        padding: 11,
                        background: 'rgba(255,255,255,.07)',
                        color: 'rgba(255,255,255,.65)',
                        border: 'none',
                        borderRadius: 11,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ← Modifica testo
                    </button>
                  }
                  {
                    <button
                      onClick={props.aiConfirmaQuiz}
                      disabled={aqg.regenIdx !== null}
                      style={{
                        flex: 2,
                        padding: 11,
                        background:
                          aqg.regenIdx !== null ? 'rgba(255,255,255,.08)' : 'linear-gradient(135deg,#22c55e,#16a34a)',
                        color: aqg.regenIdx !== null ? 'rgba(255,255,255,.40)' : '#fff',
                        border: 'none',
                        borderRadius: 11,
                        fontSize: 14,
                        fontWeight: 800,
                        cursor: aqg.regenIdx !== null ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {'✅ Aggiungi ' + (aqg.anteprima ? aqg.anteprima.length : 0) + ' domande al quiz'}
                    </button>
                  }
                </div>
              }
            </>
          )}
        </div>
      }
    </div>
  );
}

SB.AiQuizGenModal = AiQuizGenModal;
export default AiQuizGenModal;
