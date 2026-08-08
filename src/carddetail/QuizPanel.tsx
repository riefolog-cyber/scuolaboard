// QuizPanel.tsx · ScuolaBoard · pannello estratto da CardDetail
var SB = window.SB || {};
var h = SB.h || React.createElement;
var Fragment = SB.Fragment || React.Fragment;

function QuizPanel({ $, c }: any) {
  return (
    c.tipo === 'quiz' && c.quizDomande && (
                <div style={{ marginBottom: 14 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: 'rgba(236,72,153,.8)',
                      letterSpacing: 1,
                      marginBottom: 8,
                    }}
                  >
                    {'🧩 QUIZ · ' + c.quizDomande.length + ' domande'}
                    {c.quizTimer && ' ⏱ ' + c.quizTimer + ' min'}
                  </div>
                  {$.isProf && !$.simulaSt ? (
                    (function () {
                      // ── VISTA PROF: RISULTATI + classifica + valutazione aperte ──
                      var risProf = ($.quizRisposte || []).filter(function (r: any) {
                        return String(r.cardId) === String(c.id);
                      });
                      var domProf = c.quizDomande || [];
                      var haAperte = domProf.some(function (d: any) {
                        return d.tipo === 'aperta';
                      });
                      var tutteValutate = risProf.length > 0 && risProf.every(function (r: any) {
                        return r.aiValutato;
                      });
                      var pendingCount = risProf.filter(function (r: any) {
                        return !r.aiValutato;
                      }).length;
                      return (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,.58)', letterSpacing: 1 }}>
                                {'📊 RISULTATI (' + risProf.length + ' studenti)'}
                              </div>
                              <button
                                onClick={function (e: any) {
                                  e.stopPropagation();
                                  $.resetRisposte(c.id);
                                }}
                                style={{
                                  background: 'rgba(239,68,68,.15)',
                                  border: '1px solid rgba(239,68,68,.3)',
                                  borderRadius: 6,
                                  padding: '3px 8px',
                                  cursor: 'pointer',
                                  fontSize: 11,
                                  color: '#f87171',
                                  fontWeight: 700,
                                }}
                                title="Cancella tutte le risposte al quiz"
                              >
                                🗑️ Reset
                              </button>
                            </div>
                            {haAperte && (
                              <button
                                onClick={function () {
                                  $.valutaAperteProfAI(c, risProf);
                                }}
                                disabled={$.qLoading || tutteValutate}
                                style={{
                                  fontSize: 11,
                                  padding: '5px 12px',
                                  background: tutteValutate
                                    ? 'rgba(34,197,94,.15)'
                                    : $.qLoading
                                      ? 'rgba(255,255,255,.06)'
                                      : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                  border: 'none',
                                  borderRadius: 8,
                                  cursor: tutteValutate || $.qLoading ? 'not-allowed' : 'pointer',
                                  color: tutteValutate ? '#4ade80' : '#fff',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 5,
                                }}
                              >
                                {$.qLoading ? (
                                  <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⚙️</span>
                                ) : (
                                  '🤖'
                                )}
                                {$.qLoading
                                  ? 'Valutazione in corso…'
                                  : tutteValutate
                                    ? '✓ Tutte valutate'
                                    : 'Valuta risposte aperte con AI' + (pendingCount > 0 ? ' (' + pendingCount + ')' : '')}
                              </button>
                            )}
                          </div>
                          {risProf.length === 0 && (
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', textAlign: 'center', padding: '6px 0' }}>
                              Nessuno ha ancora risposto
                            </div>
                          )}
                          {risProf
                            .slice()
                            .sort(function (a: any, b: any) {
                              return ((b.punteggio || {}).pct || 0) - ((a.punteggio || {}).pct || 0);
                            })
                            .map(function (r: any, ri: number) {
                              var colore = ((r.punteggio || {}).pct || 0) >= 75 ? '#4ade80' : ((r.punteggio || {}).pct || 0) >= 50 ? '#fbbf24' : '#f87171';
                              return (
                                <div
                                  key={ri}
                                  style={{
                                    borderRadius: 12,
                                    background: 'rgba(255,255,255,.03)',
                                    border: '1px solid rgba(255,255,255,.07)',
                                    padding: '12px 14px',
                                    marginBottom: 10,
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontWeight: 800, fontSize: 13, color: '#f1f5f9' }}>{r.studente}</div>
                                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.52)' }}>{$.timeAgo(r.data)}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                      <div style={{ fontWeight: 900, fontSize: 20, color: colore }}>
                                        {((r.punteggio || {}).pct || 0) + '%'}
                                      </div>
                                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.52)' }}>
                                        {((r.punteggio || {}).score || 0) + ' / ' + ((r.punteggio || {}).totale || 0) + ' pt'}
                                      </div>
                                      {haAperte && !r.aiValutato && (
                                        <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 700, marginTop: 2 }}>
                                          ⏳ attende valutazione AI
                                        </div>
                                      )}
                                      {haAperte && r.aiValutato && (
                                        <div style={{ fontSize: 11, color: '#4ade80', fontWeight: 700, marginTop: 2 }}>
                                          ✓ valutato con AI
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {domProf.some(function (d: any) {
                                    return d.tipo !== 'aperta';
                                  }) && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: haAperte ? 8 : 0 }}>
                                      {domProf.map(function (d: any, di: number) {
                                        if (d.tipo === 'aperta') return null;
                                        var risp = r.risposte && r.risposte[di];
                                        var corretta = risp === d.corretta;
                                        var corrIdx = parseInt(risp);
                                        var rispTxt =
                                          d.tipo === 'multipla'
                                            ? d.opzioni && !isNaN(corrIdx) && d.opzioni[corrIdx]
                                              ? d.opzioni[corrIdx]
                                              : risp || '—'
                                            : risp || '—';
                                        return (
                                          <div
                                            key={di}
                                            style={{
                                              background: corretta ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.1)',
                                              border: '1px solid ' + (corretta ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.25)'),
                                              borderRadius: 6,
                                              padding: '3px 8px',
                                              fontSize: 11,
                                              color: corretta ? '#4ade80' : '#f87171',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 4,
                                            }}
                                          >
                                            <span>{corretta ? '✓' : '✗'}</span>
                                            <span style={{ color: 'rgba(255,255,255,.65)' }}>{'D' + (di + 1) + ':'}</span>
                                            <span>{rispTxt}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                  {haAperte && r.aiValutato && (
                                    <div>
                                      {domProf.map(function (d: any, di: number) {
                                        if (d.tipo !== 'aperta') return null;
                                        var s =
                                          r.aiScores &&
                                          (r.aiScores[di] ||
                                            r.aiScores[di + 1] ||
                                            (function () {
                                              var k = Object.keys(r.aiScores || {});
                                              var oi = domProf.slice(0, di + 1).filter(function (x: any) {
                                                return x.tipo === 'aperta';
                                              }).length - 1;
                                              return r.aiScores[k[oi]] || null;
                                            })());
                                        var risposta = r.risposte && r.risposte[di];
                                        return <Fragment key={di}>{$.ValutazioneApertaAI(h, s, risposta, di, d, true)}</Fragment>;
                                      })}
                                    </div>
                                  )}
                                  {haAperte && !r.aiValutato && (
                                    <div>
                                      {domProf.map(function (d: any, di: number) {
                                        if (d.tipo !== 'aperta') return null;
                                        var risposta = r.risposte && r.risposte[di];
                                        return (
                                          <div
                                            key={di}
                                            style={{
                                              background: 'rgba(255,255,255,.03)',
                                              border: '1px solid rgba(255,255,255,.07)',
                                              borderRadius: 8,
                                              padding: '8px 10px',
                                              marginBottom: 6,
                                            }}
                                          >
                                            <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,.58)', marginBottom: 4 }}>
                                              {'D' + (di + 1) + ' (aperta): ' + d.testo}
                                            </div>
                                            {risposta ? (
                                              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', fontStyle: 'italic', lineHeight: 1.6 }}>
                                                {'"' + risposta + '"'}
                                              </div>
                                            ) : (
                                              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.40)' }}>(nessuna risposta)</div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      );
                    })()
                  ) : (
                    (function () {
                    // Le risposte INTERATTIVE vivono in qRisposte (mappa per cardId),
                    // mentre quizRisposte è l'ARRAY dal listener quiz_risposte.
                    var risposteUtente = ($.qRisposte && $.qRisposte[String(c.id)]) || {};
                    // Risposta già inviata: cerca il doc dello studente corrente
                    // nell'array quizRisposte (dal listener). NON usiamo c.risposte:
                    // le Firestore Rules vietano allo studente di scriverlo.
                    var miaRisposta: any = null;
                    ($.quizRisposte || []).forEach(function (r: any) {
                      if (r.studente === $.myName($.user)) miaRisposta = r;
                    });
                    var giaRisposto = miaRisposta && miaRisposta.risposte;
                    return giaRisposto ? (
                      <div
                        style={{
                          background: 'rgba(34,197,94,.1)',
                          border: '1px solid rgba(34,197,94,.25)',
                          borderRadius: 10,
                          padding: '10px 14px',
                        }}
                      >
                        <div style={{ fontWeight: 800, color: '#4ade80', marginBottom: 6, fontSize: 12 }}>
                          ✅ Quiz completato
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)' }}>
                          Punteggio:{' '}
                          <strong>
                            {(miaRisposta.punteggio && miaRisposta.punteggio.score != null
                              ? miaRisposta.punteggio.score
                              : 0)}
                            /{c.quizDomande.length}
                          </strong>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {c.quizDomande.map(function (d: any, di: number) {
                          var rispostaUtente = risposteUtente[di];
                          return (
                            <div
                              key={di}
                              style={{
                                background: 'rgba(255,255,255,.04)',
                                border: '1px solid rgba(255,255,255,.08)',
                                borderRadius: 10,
                                padding: '10px 14px',
                                marginBottom: 8,
                              }}
                            >
                              <div
                                style={{ fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,.85)', marginBottom: 8 }}
                              >
                                {di + 1 + '. ' + d.testo}
                              </div>
                              {(d.opzioni || []).map(function (opt: any, oi: number) {
                                var sel = rispostaUtente === oi;
                                return (
                                  <button
                                    key={oi}
                                    onClick={function () {
                                      var nuovo = Object.assign({}, risposteUtente);
                                      nuovo[di] = oi;
                                      $.setQRisposte(function (p: any) {
                                        var nr = Object.assign({}, p);
                                        nr[String(c.id)] = nuovo;
                                        return nr;
                                      });
                                    }}
                                    style={{
                                      display: 'block',
                                      width: '100%',
                                      textAlign: 'left',
                                      padding: '7px 12px',
                                      marginBottom: 4,
                                      borderRadius: 8,
                                      border: '1px solid ' + (sel ? '#6366f1' : 'rgba(255,255,255,.1)'),
                                      background: sel ? 'rgba(99,102,241,.25)' : 'rgba(255,255,255,.03)',
                                      color: sel ? '#e0e7ff' : 'rgba(255,255,255,.65)',
                                      cursor: 'pointer',
                                      fontSize: 12,
                                      fontWeight: sel ? 700 : 500,
                                    }}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                        {!$.isProf && (
                          <button
                            onClick={function () {
                              $.inviaRisposteQuiz(c.id);
                            }}
                            disabled={Object.keys(risposteUtente).length < c.quizDomande.length}
                            style={{
                              width: '100%',
                              padding: 10,
                              marginTop: 4,
                              background:
                                Object.keys(risposteUtente).length >= c.quizDomande.length
                                  ? 'linear-gradient(135deg,#6366f1,#a855f7)'
                                  : 'rgba(255,255,255,.08)',
                              border: 'none',
                              borderRadius: 10,
                              color: '#fff',
                              fontSize: 13,
                              fontWeight: 800,
                              cursor:
                                Object.keys(risposteUtente).length >= c.quizDomande.length ? 'pointer' : 'not-allowed',
                            }}
                          >
                            Invia risposte
                          </button>
                        )}
                      </div>
                    );
                    })()
                  )}
                </div>
              )
  );
}
export default QuizPanel;
