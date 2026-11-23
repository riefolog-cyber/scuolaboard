import { fbDel } from './app-utils.tsx';
// ProposalsPanel.jsx · ScuolaBoard

function ProposalsPanel__({ $ }: any) {
  var isLight = !!$.isLight;
  var panelStyle = function (bg: string, border: string) {
    return {
      margin: '10px 14px 0',
      padding: '12px 14px',
      background: bg,
      border: '1px solid ' + border,
      borderRadius: 14,
      boxShadow: isLight ? '0 4px 14px rgba(15,23,42,.05)' : '0 8px 22px rgba(0,0,0,.12)',
    };
  };
  return (
    <>
      {!$.isProf &&
        !$.simulaSt &&
        $.cards.filter(function (c: any) {
          return c.proposta === true && $.user && c.autore === $.myName($.user);
        }).length > 0 && (
          <div style={panelStyle('rgba(139,92,246,.08)', 'rgba(139,92,246,.22)')}>
            <div style={{ fontWeight: 800, color: '#a78bfa', fontSize: 12, marginBottom: 8, letterSpacing: 1 }}>
              ⏳ LE TUE PROPOSTE IN ATTESA
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {$.cards
                .filter(function (c: any) {
                  return c.proposta === true && $.user && c.autore === $.myName($.user);
                })
                .map(function (c: any) {
                  return (
                    <div
                      key={c.id}
                      className="proposal-item"
                      style={{
                        background: isLight ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.05)',
                        border: '1px solid rgba(139,92,246,.22)',
                        borderRadius: 12,
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <span style={{ flex: 1, fontSize: 13, color: isLight ? '#334155' : 'rgba(255,255,255,.86)', fontWeight: 700 }}>
                        {c.titolo}
                      </span>
                      <span
                        style={{
                          background: 'rgba(139,92,246,.18)',
                          color: '#c4b5fd',
                          borderRadius: 20,
                          padding: '3px 10px',
                          fontSize: 11,
                          fontWeight: 800,
                          border: '1px solid rgba(139,92,246,.32)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        ⏳ In attesa
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      {!$.isProf &&
        !$.simulaSt &&
        $.cards.filter(function (c: any) {
          return c.proposta === 'rifiutata' && $.user && c.autore === $.myName($.user);
        }).length > 0 && (
          <div style={panelStyle(isLight ? 'rgba(239,68,68,.06)' : 'rgba(239,68,68,.07)', 'rgba(239,68,68,.22)')}>
            <div style={{ fontWeight: 800, color: 'var(--c-danger, #f87171)', fontSize: 12, marginBottom: 8, letterSpacing: 1 }}>
              ❌ PROPOSTE RIFIUTATE
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {$.cards
                .filter(function (c: any) {
                  return c.proposta === 'rifiutata' && $.user && c.autore === $.myName($.user);
                })
                .map(function (c: any) {
                  return (
                    <div
                      key={c.id}
                      className="proposal-item"
                      style={{
                        background: isLight ? 'rgba(255,255,255,.82)' : 'rgba(255,255,255,.04)',
                        border: '1px solid rgba(239,68,68,.22)',
                        borderRadius: 12,
                        padding: '10px 12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: c.motivazioneRifiuto ? 8 : 0 }}>
                        <span
                          style={{
                            flex: 1,
                            fontSize: 13,
                            color: isLight ? '#64748b' : 'rgba(255,255,255,.58)',
                            fontWeight: 600,
                            textDecoration: 'line-through',
                          }}
                        >
                          {c.titolo}
                        </span>
                        <button
                          onClick={function () {
                            fbDel(c.id);
                          }}
                          style={{
                            background: 'rgba(239,68,68,.16)',
                            color: 'var(--c-danger, #f87171)',
                            border: '1px solid rgba(239,68,68,.3)',
                            borderRadius: 9,
                            padding: '5px 10px',
                            cursor: 'pointer',
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          ✕ Ho capito
                        </button>
                      </div>
                      {c.motivazioneRifiuto && (
                        <div
                          style={{
                            fontSize: 12,
                            color: isLight ? '#475569' : 'rgba(255,255,255,.72)',
                            fontStyle: 'italic',
                            background: isLight ? 'rgba(15,23,42,.03)' : 'rgba(255,255,255,.04)',
                            borderRadius: 8,
                            padding: '7px 9px',
                            lineHeight: 1.5,
                          }}
                        >
                          {'💬 ' + c.motivazioneRifiuto}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      {$.isProf && !$.simulaSt && $.proposte.length > 0 && (
        <div style={panelStyle('rgba(249,115,22,.08)', 'rgba(249,115,22,.24)')}>
          <div style={{ fontWeight: 800, color: '#fb923c', fontSize: 12, marginBottom: 8, letterSpacing: 1 }}>
            ⏳ PROPOSTE IN ATTESA
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {$.proposte.map(function (c: any) {
              return (
                <div
                  key={c.id}
                  className="proposal-item"
                  style={{
                    background: isLight ? 'rgba(255,255,255,.82)' : 'rgba(255,255,255,.05)',
                    border: '1px solid rgba(249,115,22,.22)',
                    borderRadius: 12,
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <span style={{ flex: 1, fontSize: 13, color: isLight ? '#334155' : 'rgba(255,255,255,.86)', fontWeight: 700 }}>
                    <span
                      style={{
                        fontSize: 11,
                        color: '#fdba74',
                        fontWeight: 800,
                        marginRight: 8,
                        background: 'rgba(249,115,22,.18)',
                        padding: '2px 8px',
                        borderRadius: 10,
                        border: '1px solid rgba(249,115,22,.28)',
                      }}
                    >
                      {c.autore || 'Studente'}
                    </span>
                    {c.titolo}
                  </span>
                  <button
                    aria-label="Accetta proposta"
                    title="Accetta proposta"
                    onClick={function () {
                      $.appCard(c.id);
                    }}
                    style={{
                      background: 'rgba(34,197,94,.18)',
                      color: 'var(--c-success, #4ade80)',
                      border: '1px solid rgba(34,197,94,.32)',
                      borderRadius: 10,
                      padding: '6px 11px',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    ✓
                  </button>
                  <button
                    aria-label="Rifiuta proposta"
                    title="Rifiuta proposta"
                    onClick={function () {
                      $.setShowRifiutaModal({ id: c.id, titolo: c.titolo });
                    }}
                    style={{
                      background: 'rgba(239,68,68,.14)',
                      color: 'var(--c-danger, #f87171)',
                      border: '1px solid rgba(239,68,68,.28)',
                      borderRadius: 10,
                      padding: '6px 10px',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
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
            <div style={panelStyle(isLight ? 'rgba(245,158,11,.07)' : 'rgba(245,158,11,.05)', 'rgba(245,158,11,.18)')}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--c-warn, #fbbf24)', marginBottom: 8, letterSpacing: 1 }}>
                ★ I TUOI PREFERITI
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {prefCards.map(function (c: any) {
                  return (
                    <button
                      key={c.id}
                      onClick={function () {
                        $.openCard(c);
                      }}
                      className="proposal-item"
                      style={{
                        background: 'rgba(245,158,11,.14)',
                        border: '1px solid rgba(245,158,11,.28)',
                        borderRadius: 10,
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontSize: 12,
                        color: 'var(--c-warn, #fbbf24)',
                        fontWeight: 800,
                        maxWidth: 240,
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
            </div>
          );
        })()}
      {!$.isProf && $.showBanner && $.newCardsBanner.length > 0 && (
        <div
          style={{
            margin: '10px 14px 0',
            background: 'linear-gradient(135deg,rgba(var(--c-primary-rgb),.28),rgba(139,92,246,.22))',
            border: '1px solid rgba(var(--c-primary-rgb),.42)',
            borderRadius: 14,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 10px 26px rgba(var(--c-primary-rgb),.18)',
          }}
        >
          <span style={{ fontSize: 20 }}>🔔</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, color: '#e0e7ff', fontSize: 14 }}>
              {'+' + $.newCardsBanner.length + ' nuova card' + ($.newCardsBanner.length > 1 ? '!' : '!')}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.72)', marginTop: 2, lineHeight: 1.45 }}>
              {$.newCardsBanner
                .map(function (c: any) {
                  return c.titolo;
                })
                .join(' · ')}
            </div>
          </div>
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
        </div>
      )}
    </>
  );
}

export default ProposalsPanel__;
