// CercaModal.tsx  ·  Ricerca card per parole chiave (SOLO PROF)
// Cerca tra TUTTE le card (tutte le classi, incluse le "Solo prof") in titolo,
// testo, commenti, domande quiz e opzioni sondaggio. Scopo: verificare che un
// argomento esista già prima di creare una nuova card.
import { useState, useEffect, useMemo, createElement } from 'react';
import { norm, hilite } from '../utils/search.ts';

function CercaModal(props: any) {
  if (!props.showCerca || !props.isProf) return null;
  var isLight = !!props.isLight;
  var setShowCerca = props.setShowCerca;
  var cards = props.cards || [];
  var allCards = props.allCards || cards;
  var [q, setQ] = useState('');
  var [tuttiAnni, setTuttiAnni] = useState(false);
  // Anno scolastico scelto per la ricerca (default: quello attivo in bacheca).
  // Il pulsante 📅 apre un menu con gli anni disponibili per la ricerca.
  var annoCorrente = props.annoScolastico || '';
  var [annoScelto, setAnnoScelto] = useState(annoCorrente);
  var [annoMenuOpen, setAnnoMenuOpen] = useState(false);

  // ⚠️ "Tutti gli anni" deve cercare DAVVERO in tutti gli anni. Il dataset in
  // bacheca (allCards) contiene SOLO l'anno selezionato: firestore-sync carica
  // le card con filtro server-side .where('annoScolastico','==', anno). Quando
  // l'utente attiva il toggle carichiamo qui (fetch singolo, senza filtro)
  // tutte le card di tutti gli anni e le uniamo a quelle già in memoria.
  // any: null = caricamento in corso, poi array di card (di tutti gli anni)
  var [allYears, setAllYears] = useState<any>(null);
  var [allYearsErr, setAllYearsErr] = useState(false);

  // Serve il dataset di tutti gli anni quando si cerca in "Tutti gli anni" o in
  // un anno diverso da quello attivo in bacheca (l'unico già in memoria).
  var needsAll = tuttiAnni || annoScelto !== annoCorrente;

  useEffect(
    function () {
      // Non serve, oppure già caricato in questa apertura della modale: niente re-fetch.
      if (!needsAll || allYears !== null) return;
      setAllYearsErr(false);
      var db = (typeof window !== 'undefined' && window.db) || null;
      // Senza db (es. test unitari) resta props.allCards: è l'unica fonte.
      if (!db || !db.collection) {
        setAllYears([]);
        return;
      }
      var cancelled = false;
      db.collection('cards')
        .get()
        .then(function (snap: any) {
          if (cancelled) return;
          var a: any[] = [];
          snap.forEach(function (d: any) {
            a.push(d.data());
          });
          setAllYears(a);
        })
        .catch(function () {
          if (cancelled) return;
          setAllYearsErr(true);
          setAllYears([]);
        });
      return function () {
        cancelled = true;
      };
    },
    [needsAll, allYears]
  );

  // Unisce le card scaricate (tutti gli anni) con quelle già in memoria
  // (props.allCards), senza duplicati per id.
  var mergedAll = useMemo(
    function () {
      var map: any = {};
      [allYears, allCards].forEach(function (list: any) {
        (list || []).forEach(function (c: any) {
          if (!c || c.id == null) return;
          if (!(String(c.id) in map)) map[String(c.id)] = c;
        });
      });
      return Object.keys(map).map(function (k: string) {
        return map[k];
      });
    },
    [allYears, allCards]
  );

  // Anni selezionabili: lista config + eventuali anni presenti nei dati caricati.
  var ANNI = useMemo(
    function () {
      var cfg = (typeof window !== 'undefined' && window.SB_CONFIG) || null;
      var baseList =
        props.ANNI_DISPONIBILI ||
        (cfg && cfg.ANNI_DISPONIBILI) ||
        (typeof window !== 'undefined' ? window.ANNI_DISPONIBILI : null) ||
        [];
      var list: string[] = [];
      var seen: any = {};
      function add(a: string) {
        if (a && !seen[a]) {
          seen[a] = true;
          list.push(a);
        }
      }
      (baseList || []).forEach(add);
      mergedAll.forEach(function (c: any) {
        add(c.annoScolastico);
      });
      return list;
    },
    [props.ANNI_DISPONIBILI, mergedAll]
  );

  // Chiude il menu anni cliccando fuori di esso (capture sul document).
  useEffect(
    function () {
      if (!annoMenuOpen) return;
      function onDocClick(e: any) {
        var el = e.target;
        while (el && el !== document.body) {
          if (el.getAttribute && el.getAttribute('data-anno-picker')) return;
          el = el.parentNode;
        }
        setAnnoMenuOpen(false);
      }
      document.addEventListener('click', onDocClick, true);
      return function () {
        document.removeEventListener('click', onDocClick, true);
      };
    },
    [annoMenuOpen]
  );

  // Base della ricerca: tutti gli anni, un anno specifico (diverso da quello in
  // bacheca → filtrato dal dataset di tutti gli anni), oppure l'anno attivo già
  // in memoria (cards).
  var base = useMemo(
    function () {
      if (tuttiAnni) return mergedAll;
      if (annoScelto !== annoCorrente) {
        return mergedAll.filter(function (c: any) {
          return (c.annoScolastico || '') === annoScelto;
        });
      }
      return cards;
    },
    [tuttiAnni, annoScelto, annoCorrente, mergedAll, cards]
  );

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
        .filter(function (c: any) {
          var hay = norm(c.titolo + ' ' + (c.testo || ''));
          (c.commenti || []).forEach(function (cm: any) {
            hay += ' ' + norm(cm.testo || '');
          });
          (c.quizDomande || []).forEach(function (d: any) {
            hay += ' ' + norm(d.testo || '');
          });
          (c.opzioni || []).forEach(function (o: any) {
            hay += ' ' + norm(o.testo || '');
          });
          return terms.every(function (t: string) {
            return t && hay.indexOf(t) >= 0;
          });
        })
        .slice()
        .sort(function (a: any, b: any) {
          return (a.ordine || 0) - (b.ordine || 0);
        });
    },
    [base, q]
  );

  function open(c: any) {
    setShowCerca(false);
    if (props.openCard) props.openCard(c);
  }

  // Snippet che privilegia il campo dove il match è AVVENUTO (testo, commento,
  // domanda quiz o opzione): così l'evidenziazione cade sempre nel testo visibile.
  function matchedSnippet(c: any, terms: string[]) {
    var candidates: string[] = [];
    if (c.testo) candidates.push(c.testo);
    (c.commenti || []).forEach(function (cm: any) {
      if (cm.testo) candidates.push('💬 ' + cm.testo);
    });
    (c.quizDomande || []).forEach(function (d: any) {
      if (d.testo) candidates.push('❓ ' + d.testo);
    });
    (c.opzioni || []).forEach(function (o: any) {
      if (o.testo) candidates.push('🗳️ ' + o.testo);
    });
    var found = candidates.find(function (txt: any) {
      var n = norm(txt);
      return terms.some(function (t: string) {
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
      function onKey(e: any) {
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
        background: isLight ? 'rgba(15,23,42,.45)' : 'rgba(0,0,0,.72)',
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
            background: isLight ? '#ffffff' : 'rgba(15,23,42,.98)',
            border: isLight ? '1px solid rgba(15,23,42,.12)' : '1px solid rgba(99,102,241,.35)',
            borderRadius: 18,
            width: '100%',
            maxWidth: 580,
            maxHeight: '78vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: isLight ? '0 20px 60px rgba(15,23,42,.15)' : '0 20px 80px rgba(0,0,0,.7)',
          }}
          onClick={function (e: any) {
            e.stopPropagation();
          }}
        >
          {
            <div
              style={{
                padding: '16px 18px 12px',
                borderBottom: isLight ? '1px solid rgba(15,23,42,.08)' : '1px solid rgba(255,255,255,.08)',
              }}
            >
              {
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  {
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 900,
                        color: isLight ? '#0f172a' : '#f1f5f9',
                        letterSpacing: 0.5,
                      }}
                    >
                      🔍 Cerca nelle card
                    </span>
                  }
                  {
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        background: isLight ? 'rgba(79,70,229,.08)' : 'rgba(99,102,241,.2)',
                        color: isLight ? '#4f46e5' : '#a5b4fc',
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
                        color: isLight ? '#64748b' : 'rgba(255,255,255,.5)',
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
                  {
                    <div data-anno-picker="1" style={{ position: 'relative' }}>
                      {
                        <button
                          aria-label="Scegli anno scolastico"
                          aria-haspopup="menu"
                          aria-expanded={annoMenuOpen}
                          onClick={function (e: any) {
                            e.stopPropagation();
                            setAnnoMenuOpen(function (v: any) {
                              return !v;
                            });
                          }}
                          style={{
                            background: !tuttiAnni
                              ? isLight
                                ? 'rgba(79,70,229,.12)'
                                : 'rgba(99,102,241,.3)'
                              : isLight
                                ? 'rgba(15,23,42,.05)'
                                : 'rgba(255,255,255,.05)',
                            border:
                              '1px solid ' +
                              (!tuttiAnni
                                ? isLight
                                  ? 'rgba(79,70,229,.22)'
                                  : 'rgba(99,102,241,.55)'
                                : isLight
                                  ? 'rgba(15,23,42,.10)'
                                  : 'rgba(255,255,255,.12)'),
                            borderRadius: 8,
                            padding: '4px 10px',
                            fontSize: 11,
                            fontWeight: 700,
                            color: !tuttiAnni
                              ? isLight
                                ? '#4338ca'
                                : '#e0e7ff'
                              : isLight
                                ? '#475569'
                                : 'rgba(255,255,255,.6)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          📅 {annoScelto || annoCorrente || 'Anno corrente'} ▾
                        </button>
                      }
                      {annoMenuOpen && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 6px)',
                            left: 0,
                            background: isLight ? '#ffffff' : 'rgba(13,13,30,.98)',
                            border: isLight ? '1px solid rgba(15,23,42,.12)' : '1px solid rgba(99,102,241,.4)',
                            borderRadius: 14,
                            padding: '8px 6px',
                            zIndex: 600,
                            minWidth: 190,
                            boxShadow: isLight ? '0 12px 32px rgba(15,23,42,.12)' : '0 12px 40px rgba(0,0,0,.7)',
                          }}
                        >
                          {
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                color: 'rgba(255,255,255,.38)',
                                letterSpacing: 1.2,
                                padding: '2px 10px 8px',
                              }}
                            >
                              CERCA NELL'ANNO
                            </div>
                          }
                          {ANNI.map(function (anno: string) {
                            var sel = !tuttiAnni && anno === annoScelto;
                            return (
                              <button
                                key={anno}
                                onClick={function () {
                                  setAnnoScelto(anno);
                                  setTuttiAnni(false);
                                  setAnnoMenuOpen(false);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  width: '100%',
                                  textAlign: 'left',
                                  background: sel ? 'rgba(99,102,241,.25)' : 'transparent',
                                  border: 'none',
                                  borderRadius: 9,
                                  padding: '7px 12px',
                                  cursor: 'pointer',
                                  fontSize: 13,
                                  fontWeight: sel ? 800 : 500,
                                  color: sel ? '#e0e7ff' : 'rgba(255,255,255,.72)',
                                  marginBottom: 1,
                                }}
                              >
                                {<span style={{ width: 16, textAlign: 'center', fontSize: 12 }}>{sel ? '✓' : ''}</span>}
                                {anno}
                              </button>
                            );
                          })}
                          {
                            <div
                              style={{
                                margin: '8px 10px 4px',
                                padding: '6px 0 0',
                                borderTop: '1px solid rgba(255,255,255,.07)',
                                fontSize: 10,
                                color: 'rgba(255,255,255,.3)',
                                lineHeight: 1.5,
                              }}
                            >
                              Scegli l'anno in cui cercare.{<br />}Le card degli anni passati restano archiviate.
                            </div>
                          }
                        </div>
                      )}
                    </div>
                  }
                  {
                    <button
                      onClick={function () {
                        setTuttiAnni(true);
                        setAnnoMenuOpen(false);
                      }}
                      style={{
                        background: tuttiAnni
                          ? isLight
                            ? 'rgba(79,70,229,.12)'
                            : 'rgba(99,102,241,.3)'
                          : isLight
                            ? 'rgba(15,23,42,.05)'
                            : 'rgba(255,255,255,.05)',
                        border:
                          '1px solid ' +
                          (tuttiAnni
                            ? isLight
                              ? 'rgba(79,70,229,.22)'
                              : 'rgba(99,102,241,.55)'
                            : isLight
                              ? 'rgba(15,23,42,.10)'
                              : 'rgba(255,255,255,.12)'),
                        borderRadius: 8,
                        padding: '4px 10px',
                        fontSize: 11,
                        fontWeight: 700,
                        color: tuttiAnni
                          ? isLight
                            ? '#4338ca'
                            : '#e0e7ff'
                          : isLight
                            ? '#475569'
                            : 'rgba(255,255,255,.6)',
                        cursor: 'pointer',
                      }}
                    >
                      🗂 Tutti gli anni
                    </button>
                  }
                </div>
              }
              {
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: isLight ? '#f8fafc' : 'rgba(255,255,255,.06)',
                    border: isLight ? '1px solid rgba(15,23,42,.12)' : '1px solid rgba(99,102,241,.4)',
                    borderRadius: 12,
                    padding: '4px 10px',
                  }}
                >
                  {
                    <input
                      aria-label="Cerca card"
                      value={q}
                      onInput={function (e: any) {
                        setQ(e.target.value);
                      }}
                      placeholder="Cerca per titolo, testo, commenti…"
                      autoFocus={true}
                      style={{
                        flex: 1,
                        background: 'none',
                        border: 'none',
                        outline: 'none',
                        color: isLight ? '#0f172a' : '#f1f5f9',
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
              {needsAll && allYears === null && (
                <div style={{ fontSize: 11, color: '#a5b4fc', marginTop: 6, lineHeight: 1.5 }}>
                  ⏳ Caricamento card di tutti gli anni…
                </div>
              )}
              {needsAll && allYearsErr && (
                <div style={{ fontSize: 11, color: '#fbbf24', marginTop: 6, lineHeight: 1.5 }}>
                  ⚠️ Impossibile caricare gli anni passati: sto cercando solo nell'anno corrente.
                </div>
              )}
            </div>
          }
          {
            <div
              style={{ flex: 1, overflow: 'auto', padding: '6px 0', background: isLight ? '#ffffff' : 'transparent' }}
            >
              {!q.trim() && (
                <div style={{ padding: '34px 20px', textAlign: 'center' }}>
                  {<div style={{ fontSize: 34, marginBottom: 8, opacity: 0.7 }}>🔎</div>}
                  {
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: isLight ? '#334155' : 'rgba(255,255,255,.55)',
                        marginBottom: 4,
                      }}
                    >
                      Digita una parola chiave
                    </div>
                  }
                  {
                    <div style={{ fontSize: 11, color: isLight ? '#64748b' : 'rgba(255,255,255,.35)' }}>
                      Es. «equazioni», «Roma», «quiz frazioni»
                    </div>
                  }
                </div>
              )}
              {q.trim() && results.length === 0 && !(needsAll && allYears === null) && (
                <div style={{ padding: '34px 20px', textAlign: 'center' }}>
                  {<div style={{ fontSize: 30, marginBottom: 8, opacity: 0.6 }}>🕳️</div>}
                  {
                    <div
                      style={{ fontSize: 13, fontWeight: 700, color: isLight ? '#334155' : 'rgba(255,255,255,.55)' }}
                    >
                      Nessuna card trovata per «{q.trim()}»
                    </div>
                  }
                  {
                    <div style={{ fontSize: 11, color: isLight ? '#64748b' : 'rgba(255,255,255,.35)', marginTop: 4 }}>
                      Prova con parole diverse o controlla un altro anno scolastico.
                    </div>
                  }
                </div>
              )}
              {results.length > 0 && (
                <div
                  style={{
                    padding: '8px 14px',
                    fontSize: 11,
                    fontWeight: 800,
                    color: isLight ? '#475569' : 'rgba(255,255,255,.42)',
                    letterSpacing: 1,
                  }}
                >
                  {results.length + (results.length === 1 ? ' RISULTATO' : ' RISULTATI')}
                </div>
              )}
              {results.map(function (c: any) {
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
                    onKeyDown={function (e: any) {
                      if (e.key === 'Enter') open(c);
                    }}
                    style={{
                      margin: '2px 12px 8px',
                      padding: '10px 12px',
                      background: isLight ? '#ffffff' : 'rgba(255,255,255,.035)',
                      border: isLight ? '1px solid rgba(15,23,42,.08)' : '1px solid rgba(255,255,255,.08)',
                      borderRadius: 12,
                      cursor: 'pointer',
                      transition: 'background .15s, border-color .15s, transform .1s',
                      boxShadow: isLight ? '0 1px 6px rgba(15,23,42,.06)' : 'none',
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
                            style={{
                              background: 'rgba(239,68,68,.2)',
                              color: '#f87171',
                              padding: '2px 7px',
                              fontSize: 10,
                              fontWeight: 800,
                            }}
                          >
                            Solo prof
                          </span>
                        ) : (
                          cc.slice(0, 3).map(function (cl: string, i: number) {
                            return (
                              <span
                                key={i}
                                className="badge-chip"
                                style={{
                                  background: 'rgba(255,255,255,.07)',
                                  color: 'rgba(255,255,255,.7)',
                                  padding: '2px 7px',
                                  fontSize: 10,
                                  fontWeight: 700,
                                }}
                              >
                                {cl}
                              </span>
                            );
                          })
                        )}
                        {cc.length > 3 && (
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>+{cc.length - 3}</span>
                        )}
                        {needsAll && c.annoScolastico && (
                          <span
                            className="badge-chip"
                            style={{
                              background: 'rgba(139,92,246,.2)',
                              color: '#a78bfa',
                              padding: '2px 7px',
                              fontSize: 10,
                              fontWeight: 700,
                            }}
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
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 13,
                          color: isLight ? '#0f172a' : '#f1f5f9',
                          marginBottom: 2,
                        }}
                      >
                        {hilite(c.titolo, rawTerms, createElement)}
                      </div>
                    }
                    {snip && (
                      <div
                        style={{
                          fontSize: 11,
                          color: isLight ? '#475569' : 'rgba(255,255,255,.55)',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: 1.5,
                        }}
                      >
                        {hilite(snip, rawTerms, createElement)}
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

export default CercaModal;
