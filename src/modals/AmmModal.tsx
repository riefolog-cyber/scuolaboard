// AmmModal.tsx  ·  estratto da Modals.tsx (split Fase 2a)

import { S as SGlobal } from '../app-utils.tsx';
function AmmModal(props: any) {
  if (!props.showAmm) return null;
  var isLight = !!props.isLight;
  var showAmm = props.showAmm;
  var setShowAmm = props.setShowAmm;
  var S = props.S || SGlobal;
  var cards = props.cards || [];
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: isLight ? 'rgba(15,23,42,.45)' : 'rgba(0,0,0,.8)',
        backdropFilter: 'blur(4px)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={function () {
        setShowAmm(null);
      }}
    >
      {
        <div
          style={{
            background: isLight ? '#ffffff' : '#1c1a2e',
            border: isLight ? '1px solid rgba(15,23,42,.10)' : '1px solid rgba(245,158,11,.3)',
            borderRadius: 20,
            padding: 26,
            maxWidth: 420,
            width: '100%',
            boxShadow: isLight ? '0 20px 60px rgba(15,23,42,.15)' : 'none',
          }}
          onClick={function (e: any) {
            e.stopPropagation();
          }}
        >
          {<div style={{ fontSize: 36, textAlign: 'center', marginBottom: 8 }}>⚠️</div>}
          {
            <h3
              style={{
                margin: '0 0 4px',
                color: isLight ? '#92400e' : '#fbbf24',
                fontSize: 16,
                fontWeight: 800,
                textAlign: 'center',
              }}
            >
              Ammonisci studente
            </h3>
          }
          {
            <p
              style={{
                color: isLight ? '#475569' : 'rgba(255,255,255,.65)',
                fontSize: 12,
                textAlign: 'center',
                marginBottom: 16,
              }}
            >
              Lo studente riceverà una notifica con la motivazione.
            </p>
          }
          {
            <div style={{ marginBottom: 12 }}>
              {
                <div
                  style={{
                    fontSize: 11,
                    color: isLight ? '#475569' : 'rgba(255,255,255,.58)',
                    marginBottom: 6,
                    fontWeight: 700,
                  }}
                >
                  STUDENTE
                </div>
              }
              {showAmm.autore ? (
                <div
                  style={{
                    background: 'rgba(245,158,11,.1)',
                    border: '1px solid rgba(245,158,11,.25)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    color: '#fbbf24',
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {showAmm.autore}
                </div>
              ) : (
                <select
                  id="amm-studente"
                  aria-label="Seleziona studente"
                  style={Object.assign({}, S.input, { fontSize: 12, color: '#f1f5f9', background: '#1c1a2e' })}
                >
                  {<option value="">— Seleziona studente —</option>}
                  {(function () {
                    var tuttiNomi = [
                      ...new Set(
                        cards.flatMap(function (c: any) {
                          return (c.commenti || []).flatMap(function (cm: any) {
                            return [cm.autore].concat(
                              (cm.risposte || []).map(function (r: any) {
                                return r.autore;
                              })
                            );
                          });
                        })
                      ),
                    ]
                      .filter(function (n: any) {
                        return n && n !== 'Prof' && !String(n).startsWith('Prof');
                      })
                      .sort();
                    // Fallback: se nessuno ha ancora commentato, usa la lista studenti
                    if (tuttiNomi.length === 0 && props.studenti && props.studenti.length) {
                      tuttiNomi = props.studenti
                        .map(function (s: any) {
                          return ((s.nome || '') + (s.cognome ? ' ' + s.cognome : '')).trim();
                        })
                        .filter(function (n: any) {
                          return n;
                        })
                        .sort();
                    }
                    return tuttiNomi.map(function (n: any) {
                      return (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      );
                    });
                  })()}
                </select>
              )}
            </div>
          }
          {
            <div style={{ marginBottom: 16 }}>
              {
                <div
                  style={{
                    fontSize: 11,
                    color: isLight ? '#475569' : 'rgba(255,255,255,.58)',
                    marginBottom: 6,
                    fontWeight: 700,
                  }}
                >
                  MOTIVAZIONE
                </div>
              }
              {
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {[
                    'Commento non pertinente',
                    'Linguaggio inappropriato',
                    'Risposta superficiale o vuota',
                    'Mancanza di rispetto',
                    'Copia da un compagno',
                    'Non partecipa alla discussione',
                  ].map(function (m) {
                    return (
                      <button
                        key={m}
                        onClick={function () {
                          var el = document.getElementById('amm-input');
                          if (el) (el as any)['value'] = m;
                        }}
                        style={{
                          background: isLight ? 'rgba(15,23,42,.04)' : 'rgba(255,255,255,.06)',
                          border: isLight ? '1px solid rgba(15,23,42,.10)' : '1px solid rgba(255,255,255,.1)',
                          borderRadius: 20,
                          padding: '3px 10px',
                          cursor: 'pointer',
                          fontSize: 11,
                          color: isLight ? '#334155' : 'rgba(255,255,255,.65)',
                        }}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              }
              {
                <textarea
                  id="amm-input"
                  aria-label="Motivazione"
                  rows={3}
                  placeholder="Scrivi la motivazione…"
                  style={Object.assign({}, S.input, {
                    resize: 'none',
                    fontSize: 12,
                    background: isLight ? '#ffffff' : undefined,
                    color: isLight ? '#0f172a' : undefined,
                    borderColor: isLight ? 'rgba(15,23,42,.15)' : undefined,
                  })}
                />
              }
            </div>
          }
          {
            <div style={{ display: 'flex', gap: 8 }}>
              {
                <button
                  onClick={function () {
                    setShowAmm(null);
                  }}
                  style={{
                    flex: 1,
                    padding: 11,
                    background: isLight ? 'rgba(15,23,42,.06)' : 'rgba(255,255,255,.07)',
                    color: isLight ? '#334155' : 'rgba(255,255,255,.65)',
                    border: isLight ? '1px solid rgba(15,23,42,.08)' : 'none',
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
                  onClick={function () {
                    var el = document.getElementById('amm-input');
                    var mot = el ? (el as any)['value'].trim() : '';
                    var stud = document.getElementById('amm-studente');
                    var autore = showAmm.autore || (stud ? (stud as any)['value'] : '');
                    if (!mot || !autore) return;
                    props.ammonisci(showAmm.cardId || 0, showAmm.cmId || 0, autore, mot);
                  }}
                  style={{
                    flex: 2,
                    padding: 11,
                    background: 'linear-gradient(135deg,#f59e0b,#f97316)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 11,
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  ⚠️ Invia ammonizione
                </button>
              }
            </div>
          }
        </div>
      }
    </div>
  );
}

export default AmmModal;
