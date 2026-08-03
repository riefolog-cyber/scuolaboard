// CercaModal.tsx  ·  Ricerca card per parole chiave (SOLO PROF)
// Cerca tra TUTTE le card (tutte le classi, incluse le "Solo prof") in titolo,
// testo, commenti, domande quiz e opzioni sondaggio. Scopo: verificare che un
// argomento esista già prima di creare una nuova card.
var SB = window.SB || {};
window.SB = SB;
var h = SB.h || React.createElement;
var useState = React.useState;
var useEffect = React.useEffect;
var useMemo = React.useMemo;

// Normalizza per il match: minuscolo + rimozione accenti (è→e, à→a…).
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Evidenzia i termini nel testo (case-insensitive sul testo ORIGINALE: la
// normalizzazione NFD sposterebbe gli indici con i caratteri accentati).
function hilite(text, terms) {
  var t = String(text || '');
  if (!t || !terms.length) return t;
  var lower = t.toLowerCase();
  var out = [];
  var i = 0;
  while (i < t.length) {
    var best = null;
    terms.forEach(function (term) {
      if (!term) return;
      var idx = lower.indexOf(term, i);
      if (idx >= 0 && (best === null || idx < best.idx)) best = { idx: idx, len: term.length };
    });
    if (!best) {
      out.push(t.slice(i));
      break;
    }
    if (best.idx > i) out.push(t.slice(i, best.idx));
    out.push(
      h(
        'mark',
        {
          key: out.length,
          style: { background: 'rgba(99,102,241,.4)', color: '#fff', borderRadius: 3, padding: '0 2px' },
        },
        t.slice(best.idx, best.idx + best.len)
      )
    );
    i = best.idx + best.len;
  }
  return out;
}

function CercaModal(props) {
  if (!props.showCerca || !props.isProf) return null;
  var setShowCerca = props.setShowCerca;
  var cards = props.cards || [];
  var allCards = props.allCards || cards;
  var [q, setQ] = useState('');
  var [tuttiAnni, setTuttiAnni] = useState(false);

  var base = tuttiAnni ? allCards : cards;
  var rawTerms = String(q || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  var results = useMemo(
    function () {
      var query = norm(q).trim();
      if (!query) return [];
      var terms = query.split(/\s+/);
      return base
        .filter(function (c) {
          var hay = norm(c.titolo + ' ' + (c.testo || ''));
          (c.commenti || []).forEach(function (cm) {
            hay += ' ' + norm(cm.testo || '');
          });
          (c.quizDomande || []).forEach(function (d) {
            hay += ' ' + norm(d.testo || '');
          });
          (c.opzioni || []).forEach(function (o) {
            hay += ' ' + norm(o.testo || '');
          });
          return terms.every(function (t) {
            return t && hay.indexOf(t) >= 0;
          });
        })
        .slice()
        .sort(function (a, b) {
          return (a.ordine || 0) - (b.ordine || 0);
        });
    },
    [base, q]
  );

  function open(c) {
    setShowCerca(false);
    if (props.openCard) props.openCard(c);
  }

  // Snippet che privilegia il campo dove il match è AVVENUTO (testo, commento,
  // domanda quiz o opzione): così l'evidenziazione cade sempre nel testo visibile.
  function matchedSnippet(c, terms) {
    var candidates = [];
    if (c.testo) candidates.push(c.testo);
    (c.commenti || []).forEach(function (cm) {
      if (cm.testo) candidates.push('💬 ' + cm.testo);
    });
    (c.quizDomande || []).forEach(function (d) {
      if (d.testo) candidates.push('❓ ' + d.testo);
    });
    (c.opzioni || []).forEach(function (o) {
      if (o.testo) candidates.push('🗳️ ' + o.testo);
    });
    var found = candidates.find(function (txt) {
      var n = norm(txt);
      return terms.some(function (t) {
        return t && n.indexOf(t) >= 0;
      });
    });
    return found || candidates[0] || '';
  }

  var normTerms = (function () {
    var qn = norm(q).trim();
    return qn ? qn.split(/\s+/) : [];
  })();

  // Escape: chiude SOLO la ricerca (capture + stopPropagation, così il handler
  // globale non chiude anche la card sottostante).
  useEffect(
    function () {
      function onKey(e) {
        if (e.key === 'Escape') {
          e.stopPropagation();
          setShowCerca(false);
        }
      }
      document.addEventListener('keydown', onKey, true);
      return function () {
        document.removeEventListener('keydown', onKey, true);
      };
    },
    [setShowCerca]
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.72)',
        backdropFilter: 'blur(6px)',
        zIndex: 520,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '10vh 16px 20px',
      }}
      onClick={function () {
        setShowCerca(false);
      }}
    >
      {
        <div
          style={{
            background: 'rgba(15,23,42,.98)',
            border: '1px solid rgba(99,102,241,.35)',
            borderRadius: 18,
            width: '100%',
            maxWidth: 580,
            maxHeight: '78vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 80px rgba(0,0,0,.7)',
          }}
          onClick={function (e) {
            e.stopPropagation();
          }}
        >
          {
            <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
              {
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  {
                    <span style={{ fontSize: 15, fontWeight: 900, color: '#f1f5f9', letterSpacing: 0.5 }}>
                      🔍 Cerca nelle card
                    </span>
                  }
                  {
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        background: 'rgba(99,102,241,.2)',
                        color: '#a5b4fc',
                        borderRadius: 20,
                        padding: '2px 8px',
                        letterSpacing: 1,
                      }}
                    >
                      SOLO PROF
                    </span>
                  }
                  {<span style={{ flex: 1 }} />}
                  {
                    <button
                      aria-label="Chiudi ricerca"
                      onClick={function () {
                        setShowCerca(false);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255,255,255,.5)',
                        fontSize: 16,
                        cursor: 'pointer',
                        padding: '2px 6px',
                        lineHeight: 1,
                      }}
                    >
                      ✕
                    </button>
                  }
                </div>
              }
              {
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  {[
                    { k: false, label: '📅 ' + (props.annoScolastico || 'Anno corrente') },
                    { k: true, label: '🗂 Tutti gli anni' },
                  ].map(function (t) {
                    var sel = tuttiAnni === t.k;
                    return (
                      <button
                        key={String(t.k)}
                        onClick={function () {
                          setTuttiAnni(t.k);
                        }}
                        style={{
                          background: sel ? 'rgba(99,102,241,.3)' : 'rgba(255,255,255,.05)',
                          border: '1px solid ' + (sel ? 'rgba(99,102,241,.55)' : 'rgba(255,255,255,.12)'),
                          borderRadius: 8,
                          padding: '4px 10px',
                          fontSize: 11,
                          fontWeight: 700,
                          color: sel ? '#e0e7ff' : 'rgba(255,255,255,.6)',
                          cursor: 'pointer',
                        }}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              }
              {
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'rgba(255,255,255,.06)',
                    border: '1px solid rgba(99,102,241,.4)',
                    borderRadius: 12,
                    padding: '4px 10px',
                  }}
                >
                  {
                    <input
                      aria-label="Cerca card"
                      value={q}
                      onInput={function (e) {
                        setQ(e.target.value);
                      }}
                      placeholder="Cerca per titolo, testo, commenti…"
                      autoFocus={true}
                      style={{
                        flex: 1,
                        background: 'none',
                        border: 'none',
                        outline: 'none',
                        color: '#f1f5f9',
                        fontSize: 14,
                        padding: '7px 4px',
                      }}
                    />
                  }
                  {q && (
                    <button
                      aria-label="Svuota ricerca"
                      onClick={function () {
                        setQ('');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255,255,255,.45)',
                        cursor: 'pointer',
                        fontSize: 14,
                        padding: '2px 4px',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              }
              {
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 8, lineHeight: 1.5 }}>
                  Cerca tra tutte le classi, incluse le card «Solo prof», per verificare se un argomento esiste già.
                </div>
              }
            </div>
          }
          {
            <div style={{ flex: 1, overflow: 'auto', padding: '6px 0' }}>
              {!q.trim() && (
                <div style={{ padding: '34px 20px', textAlign: 'center' }}>
                  {
                    <div style={{ fontSize: 34, marginBottom: 8, opacity: 0.7 }}>
                      🔎
                    </div>
                  }
                  {
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.55)', marginBottom: 4 }}>
                      Digita una parola chiave
                    </div>
                  }
                  {
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)' }}>
                      Es. «equazioni», «Roma», «quiz frazioni»
                    </div>
                  }
                </div>
              )}
              {q.trim() && results.length === 0 && (
                <div style={{ padding: '34px 20px', textAlign: 'center' }}>
                  {
                    <div style={{ fontSize: 30, marginBottom: 8, opacity: 0.6 }}>
                      🕳️
                    </div>
                  }
                  {
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.55)' }}>
                      Nessuna card trovata per «{q.trim()}»
                    </div>
                  }
                  {
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginTop: 4 }}>
                      Prova con parole diverse o controlla un altro anno scolastico.
                    </div>
                  }
                </div>
              )}
              {results.length > 0 && (
                <div style={{ padding: '8px 14px', fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,.42)', letterSpacing: 1 }}>
                  {results.length + (results.length === 1 ? ' RISULTATO' : ' RISULTATI')}
                </div>
              )}
              {results.map(function (c) {
                var cc = c.classi || [];
                var senzaClasse = cc.length === 0;
                var nascosta = c.visibile === false;
                var snip = matchedSnippet(c, normTerms);
                return (
                  <div
                    key={String(c.id)}
                    role="button"
                    tabIndex={0}
                    onClick={function () {
                      open(c);
                    }}
                    onKeyDown={function (e) {
                      if (e.key === 'Enter') open(c);
                    }}
                    style={{
                      margin: '2px 12px 8px',
                      padding: '10px 12px',
                      background: 'rgba(255,255,255,.035)',
                      border: '1px solid rgba(255,255,255,.08)',
                      borderRadius: 12,
                      cursor: 'pointer',
                      transition: 'background .15s, border-color .15s, transform .1s',
                    }}
                  >
                    {
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                        {
                          <span
                            className="badge-chip"
                            style={{
                              background: props.badgeBg ? props.badgeBg(c.tipo) : '#6366f1',
                              color: '#fff',
                              padding: '2px 8px',
                              fontSize: 10,
                              fontWeight: 800,
                              letterSpacing: 0.5,
                            }}
                          >
                            {(props.tipoIcon ? props.tipoIcon(c.tipo) : '') + ' ' + (c.tipo || '').toUpperCase()}
                          </span>
                        }
                        {senzaClasse ? (
                          <span
                            className="badge-chip"
                            style={{ background: 'rgba(239,68,68,.2)', color: '#f87171', padding: '2px 7px', fontSize: 10, fontWeight: 800 }}
                          >
                            Solo prof
                          </span>
                        ) : (
                          cc.slice(0, 3).map(function (cl, i) {
                            return (
                              <span
                                key={i}
                                className="badge-chip"
                                style={{ background: 'rgba(255,255,255,.07)', color: 'rgba(255,255,255,.7)', padding: '2px 7px', fontSize: 10, fontWeight: 700 }}
                              >
                                {cl}
                              </span>
                            );
                          })
                        )}
                        {cc.length > 3 && (
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>+{cc.length - 3}</span>
                        )}
                        {tuttiAnni && c.annoScolastico && (
                          <span
                            className="badge-chip"
                            style={{ background: 'rgba(139,92,246,.2)', color: '#a78bfa', padding: '2px 7px', fontSize: 10, fontWeight: 700 }}
                          >
                            📅 {c.annoScolastico}
                          </span>
                        )}
                        {nascosta && (
                          <span style={{ fontSize: 10, fontWeight: 800, color: '#f87171' }}>🚫 nascosta</span>
                        )}
                        {c.proposta === true && (
                          <span style={{ fontSize: 10, fontWeight: 800, color: '#fbbf24' }}>⏳ proposta</span>
                        )}
                        {(c.commenti || []).length > 0 && (
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>
                            💬 {(c.commenti || []).length}
                          </span>
                        )}
                      </div>
                    }
                    {
                      <div style={{ fontWeight: 800, fontSize: 13, color: '#f1f5f9', marginBottom: 2 }}>
                        {hilite(c.titolo, rawTerms)}
                      </div>
                    }
                    {snip && (
                      <div
                        style={{
                          fontSize: 11,
                          color: 'rgba(255,255,255,.55)',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: 1.5,
                        }}
                      >
                        {hilite(snip, rawTerms)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          }
        </div>
      }
    </div>
  );
}

SB.CercaModal = CercaModal;
export default CercaModal;
