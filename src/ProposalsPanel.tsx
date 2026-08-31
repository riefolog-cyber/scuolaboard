import { Fragment } from 'react';
import { fbDel } from './app-utils.tsx';
// ProposalsPanel.jsx · ScuolaBoard

function ProposalsPanel__({ $ }: any) {
  return (
    <>
      {!$.isProf &&
        !$.simulaSt &&
        $.cards.filter(function (c: any) {
          return c.proposta === true && $.user && c.autore === $.myName($.user);
        }).length > 0 && (
          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(139,92,246,.06)',
              borderBottom: '1px solid rgba(139,92,246,.15)',
            }}
          >
            {
              <div style={{ fontWeight: 700, color: '#a78bfa', fontSize: 11, marginBottom: 7, letterSpacing: 1 }}>
                ⏳ LE TUE PROPOSTE IN ATTESA
              </div>
            }
            {
              <div>
                {$.cards
                  .filter(function (c: any) {
                    return c.proposta === true && $.user && c.autore === $.myName($.user);
                  })
                  .map(function (c: any) {
                    return (
                      <div
                        key={c.id}
                        style={{
                          background: 'rgba(255,255,255,.04)',
                          border: '1px solid rgba(139,92,246,.2)',
                          borderRadius: 9,
                          padding: '8px 12px',
                          marginBottom: 5,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        {
                          <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,.8)', fontWeight: 600 }}>
                            {c.titolo}
                          </span>
                        }
                        {
                          <span
                            style={{
                              background: 'rgba(139,92,246,.2)',
                              color: '#a78bfa',
                              borderRadius: 20,
                              padding: '2px 8px',
                              fontSize: 11,
                              fontWeight: 700,
                              border: '1px solid rgba(139,92,246,.3)',
                            }}
                          >
                            ⏳ In attesa del prof
                          </span>
                        }
                      </div>
                    );
                  })}
              </div>
            }
          </div>
        )}
      {!$.isProf &&
        !$.simulaSt &&
        $.cards.filter(function (c: any) {
          return c.proposta === 'rifiutata' && $.user && c.autore === $.myName($.user);
        }).length > 0 && (
          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(239,68,68,.06)',
              borderBottom: '1px solid rgba(239,68,68,.15)',
            }}
          >
            {
              <div style={{ fontWeight: 700, color: '#f87171', fontSize: 11, marginBottom: 7, letterSpacing: 1 }}>
                ❌ PROPOSTE RIFIUTATE
              </div>
            }
            {
              <div>
                {$.cards
                  .filter(function (c: any) {
                    return c.proposta === 'rifiutata' && $.user && c.autore === $.myName($.user);
                  })
                  .map(function (c: any) {
                    return (
                      <div
                        key={c.id}
                        style={{
                          background: 'rgba(255,255,255,.04)',
                          border: '1px solid rgba(239,68,68,.2)',
                          borderRadius: 9,
                          padding: '8px 12px',
                          marginBottom: 5,
                        }}
                      >
                        {
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              marginBottom: c.motivazioneRifiuto ? 6 : 0,
                            }}
                          >
                            {
                              <span
                                style={{
                                  flex: 1,
                                  fontSize: 13,
                                  color: 'rgba(255,255,255,.55)',
                                  fontWeight: 600,
                                  textDecoration: 'line-through',
                                }}
                              >
                                {c.titolo}
                              </span>
                            }
                            {
                              <button
                                onClick={function () {
                                  fbDel(c.id);
                                }}
                                style={{
                                  background: 'rgba(239,68,68,.2)',
                                  color: '#f87171',
                                  border: 'none',
                                  borderRadius: 7,
                                  padding: '3px 9px',
                                  cursor: 'pointer',
                                  fontSize: 11,
                                  fontWeight: 700,
                                }}
                              >
                                ✕ Ho capito
                              </button>
                            }
                          </div>
                        }
                        {c.motivazioneRifiuto && (
                          <div
                            style={{
                              fontSize: 11,
                              color: 'rgba(255,255,255,.65)',
                              fontStyle: 'italic',
                              background: 'rgba(255,255,255,.03)',
                              borderRadius: 6,
                              padding: '5px 8px',
                            }}
                          >
                            {'\ud83d\udcac ' + c.motivazioneRifiuto}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            }
          </div>
        )}
      {$.isProf && !$.simulaSt && $.proposte.length > 0 && (
        <div
          style={{
            padding: '10px 14px',
            background: 'rgba(249,115,22,.06)',
            borderBottom: '1px solid rgba(249,115,22,.15)',
          }}
        >
          {
            <div style={{ fontWeight: 700, color: '#fb923c', fontSize: 11, marginBottom: 7, letterSpacing: 1 }}>
              ⏳ PROPOSTE IN ATTESA
            </div>
          }
          {$.proposte.map(function (c: any) {
            return (
              <div
                key={c.id}
                style={{
                  background: 'rgba(255,255,255,.04)',
                  border: '1px solid rgba(249,115,22,.2)',
                  borderRadius: 9,
                  padding: '8px 12px',
                  marginBottom: 5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {
                  <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,.8)', fontWeight: 600 }}>
                    {
                      <span
                        style={{
                          fontSize: 11,
                          color: '#fb923c',
                          fontWeight: 800,
                          marginRight: 6,
                          background: 'rgba(249,115,22,.15)',
                          padding: '1px 6px',
                          borderRadius: 10,
                        }}
                      >
                        {c.autore || 'Studente'}
                      </span>
                    }
                    {c.titolo}
                  </span>
                }
                {
                  <button
                    aria-label="Accetta proposta"
                    title="Accetta proposta"
                    onClick={function () {
                      $.appCard(c.id);
                    }}
                    style={{
                      background: 'rgba(34,197,94,.2)',
                      color: '#4ade80',
                      border: '1px solid rgba(34,197,94,.3)',
                      borderRadius: 7,
                      padding: '3px 10px',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    ✓
                  </button>
                }
                {
                  <button
                    aria-label="Rifiuta proposta"
                    title="Rifiuta proposta"
                    onClick={function () {
                      $.setShowRifiutaModal({ id: c.id, titolo: c.titolo });
                    }}
                    style={{
                      background: 'rgba(239,68,68,.15)',
                      color: '#f87171',
                      border: 'none',
                      borderRadius: 7,
                      padding: '3px 8px',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    ✕
                  </button>
                }
              </div>
            );
          })}
        </div>
      )}
      {!$.isProf &&
        !$.simulaSt &&
        $.preferiti.length > 0 &&
        (function () {
          var prefCards = $.visible.filter(function (c: any) {
            return $.preferiti.indexOf(String(c.id)) >= 0;
          });
          if (!prefCards.length) return null;
          return (
            <div
              style={{
                padding: '8px 14px',
                background: 'rgba(245,158,11,.04)',
                borderBottom: '1px solid rgba(245,158,11,.12)',
              }}
            >
              {
                <div style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24', marginBottom: 7, letterSpacing: 1 }}>
                  ★ I TUOI PREFERITI
                </div>
              }
              {
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {prefCards.map(function (c: any) {
                    return (
                      <button
                        key={c.id}
                        onClick={function () {
                          $.openCard(c);
                        }}
                        style={{
                          background: 'rgba(245,158,11,.12)',
                          border: '1px solid rgba(245,158,11,.25)',
                          borderRadius: 8,
                          padding: '4px 12px',
                          cursor: 'pointer',
                          fontSize: 12,
                          color: '#fbbf24',
                          fontWeight: 700,
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {c.titolo}
                      </button>
                    );
                  })}
                </div>
              }
            </div>
          );
        })()}
      {!$.isProf && $.showBanner && $.newCardsBanner.length > 0 && (
        <div
          style={{
            margin: '8px 14px 0',
            background: 'linear-gradient(135deg,rgba(99,102,241,.25),rgba(139,92,246,.2))',
            border: '1px solid rgba(99,102,241,.4)',
            borderRadius: 12,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {<span style={{ fontSize: 18 }}>🔔</span>}
          {
            <div style={{ flex: 1 }}>
              {
                <div style={{ fontWeight: 800, color: '#e0e7ff', fontSize: 13 }}>
                  {'+' + $.newCardsBanner.length + ' nuova card' + ($.newCardsBanner.length > 1 ? '!' : '!')}
                </div>
              }
              {
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.65)' }}>
                  {$.newCardsBanner
                    .map(function (c: any) {
                      return c.titolo;
                    })
                    .join(' · ')}
                </div>
              }
            </div>
          }
          {
            <button
              onClick={function () {
                $.newCardsBanner.forEach(function (c: any) {
                  $.markSeen(c.id);
                });
                $.setShowBanner(false);
                $.setNewCardsBanner([]);
              }}
              className="btn btn-ghost btn-sm"
            >
              ✓ Visto
            </button>
          }
        </div>
      )}
    </>
  );
}

export default ProposalsPanel__;
