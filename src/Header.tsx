// Header.jsx · ScuolaBoard
var SB = window.SB || {};

function Header__({ $ }: any) {
  var isLight = !!$.isLight;
  // Pura lookup (nessun ternario, nemmeno camuffato): la guardia tema-token
  // cerca la forma con `?`, e un `isLight === true ? …` la aggirerebbe.
  var prossimoTema = ['chiaro', 'scuro'][Number(isLight === true)];
  var toggleTheme = $.toggleTheme || function () {};
  return (
    <div
      className="scuola-header"
      style={{
        background: 'var(--sb-header-bg)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--sb-header-border)',
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        position: 'sticky',
        top: 0,
        zIndex: 50,
        flexWrap: 'wrap',
        boxShadow: 'var(--sb-header-shadow)',
      }}
    >
      {
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {
            <span style={{ fontWeight: 900, fontSize: 16, color: 'var(--sb-text-1)', letterSpacing: 2 }}>
              SCUOLA
            </span>
          }
          {
            <span
              style={{
                fontWeight: 900,
                fontSize: 16,
                background: 'linear-gradient(135deg,var(--c-primary, #6366f1),#a855f7)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: 2,
              }}
            >
              BOARD
            </span>
          }
        </div>
      }
      {
        <span
          className="header-chip"
          style={{
            background: $.isProf ? 'var(--sb-primary-soft-bg)' : 'rgba(34,197,94,.15)',
            color: $.isProf ? 'var(--sb-primary-fg)' : 'var(--sb-success-fg, #4ade80)',
          }}
        >
          {$.user.photoURL && (
            <img src={$.user.photoURL} alt="" style={{ width: 16, height: 16, borderRadius: '50%' }} />
          )}
          {$.isProf ? '👨‍🏫 Prof' : '🎒 ' + $.user.nome}
        </span>
      }
      {/* Solo la classe dell'ANNO SELEZIONATO ($.classeCorrente): il fallback
          sul campo piatto mostrava la classe di un altro anno. */}
      {!$.isProf && $.classeCorrente && (
        <span
          className="header-chip"
          style={{
            background: 'rgba(251,146,60,.2)',
            color: '#fb923c',
          }}
        >
          {$.classeCorrente}
        </span>
      )}
      {!$.isProf && !($.user.classiPerAnno || {})[$.annoScolastico] && (
        <button
          onClick={function () {
            $.setShowClasseModal(true);
          }}
          aria-label="Scegli la tua classe"
          className="header-chip"
          style={{
            background: 'rgba(239,68,68,.2)',
            color: 'var(--c-danger, #f87171)',
            border: '1px solid rgba(239,68,68,.3)',
            cursor: 'pointer',
          }}
        >
          ⚠️ Scegli classe
        </button>
      )}
      {$.simulaSt && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {
            <span
              className="header-chip"
              style={{
                background: 'rgba(249,115,22,.25)',
                color: '#fb923c',
                border: '1px solid rgba(249,115,22,.5)',
                padding: '2px 10px',
                fontWeight: 800,
              }}
            >
              👁️ VISTA STUDENTE
            </span>
          }
          {
            <select
              value={$.previewClasse}
              onChange={function (e: any) {
                $.setPreviewClasse(e.target.value);
              }}
              style={{
                background: 'rgba(255,255,255,.08)',
                border: '1px solid rgba(249,115,22,.4)',
                borderRadius: 8,
                padding: '3px 8px',
                fontSize: 11,
                color: '#fb923c',
                cursor: 'pointer',
              }}
            >
              {<option value="TUTTE">Tutte le classi</option>}
              {$.CLASSI_LIST.map(function (cl: any) {
                return (
                  <option key={cl} value={cl}>
                    {cl}
                  </option>
                );
              })}
            </select>
          }
        </div>
      )}
      {
        <div
          style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
          onClick={function (e: any) {
            e.stopPropagation();
          }}
        >
          {
            <button
              onClick={function (e: any) {
                e.stopPropagation();
                $.setShowAnnoMenu(function (v: any) {
                  return !v;
                });
              }}
              style={{
                background: 'var(--sb-primary-soft-bg)',
                border: '1px solid var(--sb-primary-soft-border)',
                borderRadius: 20,
                padding: '3px 13px',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 800,
                color: 'var(--sb-primary-fg)',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                whiteSpace: 'nowrap',
              }}
            >
              📅 {$.annoScolastico} ▾
            </button>
          }
          {$.showAnnoMenu && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                background: 'rgba(13,13,30,.98)',
                border: '1px solid rgba(var(--c-primary-rgb),.4)',
                borderRadius: 14,
                padding: '8px 6px',
                zIndex: 300,
                minWidth: 170,
                boxShadow: '0 12px 40px rgba(0,0,0,.7)',
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
                  ANNO SCOLASTICO
                </div>
              }
              {$.ANNI_DISPONIBILI.map(function (anno: any) {
                var sel = anno === $.annoScolastico;
                return (
                  <button
                    key={anno}
                    onClick={function (e: any) {
                      e.stopPropagation();
                      $.setAnnoScolastico(anno);
                      try {
                        SB.LS.anno.set(anno);
                      } catch (ex) {}
                      $.setShowAnnoMenu(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      textAlign: 'left',
                      background: sel ? 'rgba(var(--c-primary-rgb),.25)' : 'transparent',
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
                  Ogni anno ha la sua bacheca.{<br />}I dati passati restano archiviati.
                </div>
              }
            </div>
          )}
        </div>
      }
      {<div style={{ flex: 1 }} />}
      <button
        aria-label={'Passa a tema ' + prossimoTema}
        title={'Tema ' + prossimoTema}
        onClick={function () {
          toggleTheme();
        }}
        style={{
          background: 'var(--sb-btn-soft-bg)',
          border: '1px solid var(--sb-btn-soft-border)',
          borderRadius: 8,
          padding: '5px 9px',
          cursor: 'pointer',
          fontSize: 14,
          color: 'var(--sb-text-1)',
        }}
      >
        {prossimoTema === 'scuro' ? '🌙' : '☀️'}
      </button>
      {/* Campanella notifiche in-app (solo app aperta) */}
      <div style={{ position: 'relative' }}>
        <button
          aria-label="Notifiche"
          title={($.nonLette || 0) > 0 ? $.nonLette + ' notifiche non lette' : 'Notifiche'}
          onClick={function (e: any) {
            e.stopPropagation();
            $.setShowNotifiche(function (v: any) {
              return !v;
            });
          }}
          style={{
            background: ($.nonLette || 0) > 0 ? 'var(--sb-primary-soft-bg)' : 'var(--sb-btn-soft-bg)',
            border:
              '1px solid ' +
              (($.nonLette || 0) > 0 ? 'var(--sb-primary-soft-border)' : 'var(--sb-btn-soft-border)'),
            borderRadius: 8,
            padding: '5px 9px',
            cursor: 'pointer',
            fontSize: 14,
            color: ($.nonLette || 0) > 0 ? 'var(--sb-primary-fg)' : 'var(--sb-text-3)',
            position: 'relative',
          }}
        >
          🔔
          {($.nonLette || 0) > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -6,
                right: -6,
                // Rosso scuro: il vecchio #ef4444 con testo bianco era 3,7:1,
                // sotto AA per un numero da 10px.
                background: '#b91c1c',
                color: '#fff',
                fontSize: 10,
                fontWeight: 800,
                minWidth: 16,
                height: 16,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                border: '1px solid rgba(0,0,0,.2)',
              }}
            >
              {$.nonLette > 9 ? '9+' : $.nonLette}
            </span>
          )}
        </button>
        {$.showNotifiche && (
          <div
            onClick={function (e: any) {
              e.stopPropagation();
            }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: 320,
              maxHeight: 380,
              overflow: 'auto',
              background: 'var(--sb-menu-bg)',
              border: '1px solid var(--sb-menu-border)',
              borderRadius: 14,
              boxShadow: 'var(--sb-menu-shadow)',
              zIndex: 400,
              padding: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 4px 8px',
                borderBottom: '1px solid var(--sb-line)',
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: 'var(--sb-text-1)',
                  letterSpacing: 0.5,
                }}
              >
                🔔 NOTIFICHE
              </span>
              {($.notifiche || []).length > 0 && (
                <button
                  onClick={function () {
                    if (confirm('Eliminare tutte le notifiche?')) {
                      var dbc: any = (window as any).db;
                      if (dbc) dbc.collection('notifiche').doc($.user.uid).delete();
                    }
                  }}
                  aria-label="Pulisci notifiche"
                  title="Pulisci notifiche"
                  style={{
                    background: 'var(--sb-danger-soft-bg)',
                    border: '1px solid var(--sb-danger-soft-border)',
                    borderRadius: 6,
                    padding: '3px 8px',
                    fontSize: 11,
                    color: 'var(--sb-danger-fg)',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            {(!$.notifiche || $.notifiche.length === 0) && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '18px 14px',
                  color: 'var(--sb-text-3)',
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--sb-text-2)' }}>Nessuna notifica</div>
                <div>Quando ci saranno novità su card, commenti o avvisi le vedrai qui.</div>
              </div>
            )}
            {($.notifiche || [])
              .slice()
              .reverse()
              .slice(0, 30)
              .map(function (n: any) {
                var icon =
                  n.tipo === 'nuova_card'
                    ? '📌'
                    : n.tipo === 'proposta_esito'
                      ? '✅'
                      : n.tipo === 'ammonizione'
                        ? '⚠️'
                        : '💬';
                return (
                  <div
                    key={n.id}
                    onClick={function () {
                      $.segnaLetta(n.id);
                      $.setShowNotifiche(false);
                      var card = ($.cards || $.visibleSorted || []).find(function (c: any) {
                        return String(c.id) === String(n.cardId);
                      });
                      if (card && $.openCard) $.openCard(card);
                    }}
                    style={{
                      display: 'flex',
                      gap: 8,
                      padding: '8px 8px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: n.letta ? 'transparent' : 'var(--sb-primary-soft-bg)',
                      border: '1px solid ' + (n.letta ? 'transparent' : 'var(--sb-primary-soft-border)'),
                      marginBottom: 4,
                      alignItems: 'flex-start',
                    }}
                  >
                    <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: n.letta ? 500 : 700,
                          color: n.letta ? 'var(--sb-text-2)' : 'var(--sb-notifica-nonletta)',
                          lineHeight: 1.35,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {n.titolo}
                      </div>
                      <div
                        style={{ fontSize: 11, color: 'var(--sb-text-3)', lineHeight: 1.4 }}
                      >
                        {n.msg}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--sb-text-3)', marginTop: 2 }}>
                        {$.timeAgo ? $.timeAgo(n.createdAt) : ''}
                      </div>
                    </div>
                    {!n.letta && (
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: 'var(--c-primary, #6366f1)',
                          flexShrink: 0,
                          marginTop: 6,
                        }}
                      />
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
      {
        <button
          aria-label="Cerca nelle card"
          title="Cerca nelle card"
          onClick={function () {
            $.setShowCerca(true);
          }}
          style={{
            background: 'var(--sb-primary-soft-bg)',
            border: '1px solid var(--sb-primary-soft-border)',
            borderRadius: 8,
            padding: '5px 9px',
            cursor: 'pointer',
            fontSize: 14,
            color: 'var(--sb-primary-fg)',
          }}
        >
          🔍
        </button>
      }
      {$.isProf && !$.simulaSt && (
        <button
          aria-label="Ammonizioni"
          onClick={function () {
            $.setShowAmm({ autore: null, cardId: null, cmId: null });
          }}
          style={{
            background: 'var(--sb-warn-soft-bg)',
            border: '1px solid var(--sb-warn-soft-border)',
            borderRadius: 8,
            padding: '5px 9px',
            cursor: 'pointer',
            fontSize: 14,
            color: 'var(--sb-warn-fg)',
          }}
        >
          ⚠️
        </button>
      )}
      {
        <button
          aria-label="Stampa bacheca"
          title="Stampa / salva PDF della bacheca"
          onClick={function () {
            $.setShowStampa(true);
          }}
          style={{
            background: 'rgba(34,197,94,.12)',
            border: '1px solid rgba(34,197,94,.3)',
            borderRadius: 8,
            padding: '5px 9px',
            cursor: 'pointer',
            fontSize: 14,
            color: 'var(--c-success, #4ade80)',
          }}
        >
          🖨️
        </button>
      }
      {
        <button
          aria-label="QR Code bacheca"
          onClick={function () {
            $.setShowQR(true);
          }}
          style={{
            background: 'var(--sb-btn-soft-bg)',
            border: '1px solid var(--sb-btn-soft-border)',
            borderRadius: 8,
            padding: '5px 9px',
            cursor: 'pointer',
            fontSize: 14,
            color: 'var(--sb-text-3)',
          }}
        >
          ◆
        </button>
      }
      {$.isProf && (
        <button
          onClick={function () {
            $.setPreviewSt(function (v: any) {
              return !v;
            });
          }}
          style={{
            background: $.simulaSt ? 'var(--sb-warn-soft-bg)' : 'var(--sb-btn-soft-bg)',
            border: '1px solid ' + ($.simulaSt ? 'var(--sb-warn-soft-border)' : 'var(--sb-btn-soft-border)'),
            borderRadius: 8,
            padding: '5px 10px',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 700,
            color: $.simulaSt ? 'var(--sb-warn-fg)' : 'var(--sb-text-3)',
          }}
        >
          {$.simulaSt ? '🔙 Prof' : '👁️ Studente'}
        </button>
      )}
      {$.isProf && !$.simulaSt && (
        <div
          style={{
            display: 'flex',
            gap: 2,
            background: 'var(--sb-btn-soft-bg)',
            borderRadius: 9,
            padding: 3,
            border: '1px solid var(--sb-line)',
          }}
        >
          {[
            { k: 'bacheca', i: '📌' },
            { k: 'analisi', i: '🤖' },
            { k: '$.studenti', i: '👥' },
          ].map(function (t) {
            return (
              <button
                key={t.k}
                aria-label={
                  t.k === 'bacheca' ? 'Vai alla bacheca' : t.k === 'analisi' ? 'Analisi AI' : 'Gestione studenti'
                }
                onClick={function () {
                  $.setView(t.k);
                  $.setViewStudenti(t.k === '$.studenti');
                }}
                style={{
                  padding: '4px 11px',
                  borderRadius: 7,
                  border: 'none',
                  background: $.view === t.k ? 'var(--sb-primary-solid)' : 'transparent',
                  color: $.view === t.k ? '#fff' : 'var(--sb-text-3)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                {t.i}
              </button>
            );
          })}
        </div>
      )}
      {!$.isProf && !$.simulaSt && (
        <button
          onClick={function () {
            $.setShowProfilo(true);
          }}
          style={{
            background: 'var(--sb-primary-soft-bg)',
            border: '1px solid var(--sb-primary-soft-border)',
            borderRadius: 8,
            padding: '4px 9px',
            cursor: 'pointer',
            fontSize: 12,
            color: 'var(--sb-primary-fg)',
            fontWeight: 700,
          }}
        >
          📊 Il mio profilo
        </button>
      )}
      {
        <button onClick={$.logout} className="btn btn-ghost btn-sm">
          Esci
        </button>
      }
    </div>
  );
}

export default Header__;
