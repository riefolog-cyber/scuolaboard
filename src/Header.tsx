// Header.jsx · ScuolaBoard
var SB = window.SB || {};
var h = SB.h || React.createElement;

function Header__({ $ }: any) {
  var isLight = !!$.isLight;
  var toggleTheme = $.toggleTheme || function(){};
  return (
    <div
      className="scuola-header"
      style={{
        background: isLight ? 'rgba(255,255,255,.92)' : 'rgba(15,20,40,.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: isLight ? '1px solid rgba(15,23,42,.08)' : '1px solid rgba(99,102,241,.18)',
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        position: 'sticky',
        top: 0,
        zIndex: 50,
        flexWrap: 'wrap',
        boxShadow: isLight ? '0 2px 20px rgba(15,23,42,.06)' : '0 2px 20px rgba(0,0,0,.3)',
      }}
    >
      {
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {<span style={{ fontWeight: 900, fontSize: 16, color: isLight ? '#0f172a' : '#fff', letterSpacing: 2 }}>SCUOLA</span>}
          {
            <span
              style={{
                fontWeight: 900,
                fontSize: 16,
                background: 'linear-gradient(135deg,#6366f1,#a855f7)',
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
            background: $.isProf ? 'rgba(99,102,241,.2)' : 'rgba(34,197,94,.15)',
            color: $.isProf ? '#a5b4fc' : '#4ade80',
          }}
        >
          {$.user.photoURL && (
            <img src={$.user.photoURL} alt="" style={{ width: 16, height: 16, borderRadius: '50%' }} />
          )}
          {$.isProf ? '👨‍🏫 Prof' : '🎒 ' + $.user.nome}
        </span>
      }
      {!$.isProf && ($.classeCorrente || $.user.classe) && (
        <span
          className="header-chip"
          style={{
            background: 'rgba(251,146,60,.2)',
            color: '#fb923c',
          }}
        >
          {$.classeCorrente || $.user.classe}
        </span>
      )}
      {!$.isProf && !($.user.classiPerAnno || {})[$.annoScolastico] && (
        <button
          onClick={function () {
            $.setShowClasseModal(true);
          }}
          className="header-chip"
          style={{
            background: 'rgba(239,68,68,.2)',
            color: '#f87171',
            border: '1px solid rgba(239,68,68,.3)',
            cursor: 'pointer',
          }}
        >
          ⚠️ Scegli classe
        </button>
      )}
      {!$.isProf && !($.user.classiPerAnno || {})[$.annoScolastico] && (
        <button
          onClick={function () {
            $.setShowClasseModal(true);
          }}
          aria-label="Scegli la tua classe"
          className="header-chip"
          style={{
            background: 'rgba(255,255,255,.06)',
            color: 'rgba(255,255,255,.58)',
            border: '1px solid rgba(255,255,255,.1)',
            padding: '2px 8px',
            cursor: 'pointer',
          }}
        >
          ✏️
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
                background: 'rgba(99,102,241,.2)',
                border: '1px solid rgba(99,102,241,.45)',
                borderRadius: 20,
                padding: '3px 13px',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 800,
                color: '#c4b5fd',
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
                border: '1px solid rgba(99,102,241,.4)',
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
                  Ogni anno ha la sua bacheca.{<br />}I dati passati restano archiviati.
                </div>
              }
            </div>
          )}
        </div>
      }
      {<div style={{ flex: 1 }} />}
      <button
        aria-label={isLight ? 'Passa a tema scuro' : 'Passa a tema chiaro'}
        title={isLight ? 'Tema scuro' : 'Tema chiaro'}
        onClick={function(){ toggleTheme(); }}
        style={{
          background: isLight ? 'rgba(15,23,42,.06)' : 'rgba(255,255,255,.06)',
          border: '1px solid ' + (isLight ? 'rgba(15,23,42,.12)' : 'rgba(255,255,255,.1)'),
          borderRadius: 8,
          padding: '5px 9px',
          cursor: 'pointer',
          fontSize: 14,
          color: isLight ? '#0f172a' : 'rgba(255,255,255,.85)',
        }}
      >
        {isLight ? '🌙' : '☀️'}
      </button>
      {/* Campanella notifiche in-app (solo app aperta) */}
      <div style={{ position: 'relative' }}>
        <button
          aria-label="Notifiche"
          title={($.nonLette || 0) > 0 ? $.nonLette + ' notifiche non lette' : 'Notifiche'}
          onClick={function (e: any) {
            e.stopPropagation();
            $.setShowNotifiche(function (v: any) { return !v; });
          }}
          style={{
            background: ($.nonLette || 0) > 0 ? (isLight ? 'rgba(79,70,229,.12)' : 'rgba(99,102,241,.25)') : (isLight ? 'rgba(15,23,42,.06)' : 'rgba(255,255,255,.06)'),
            border: '1px solid ' + (($.nonLette || 0) > 0 ? (isLight ? 'rgba(79,70,229,.22)' : 'rgba(99,102,241,.45)') : (isLight ? 'rgba(15,23,42,.10)' : 'rgba(255,255,255,.1)')),
            borderRadius: 8,
            padding: '5px 9px',
            cursor: 'pointer',
            fontSize: 14,
            color: ($.nonLette || 0) > 0 ? (isLight ? '#4f46e5' : '#a5b4fc') : (isLight ? '#334155' : 'rgba(255,255,255,.7)'),
            position: 'relative',
          }}
        >
          🔔
          {($.nonLette || 0) > 0 && (
            <span style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 800, minWidth: 16, height: 16, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '1px solid rgba(0,0,0,.2)' }}>
              {$.nonLette > 9 ? '9+' : $.nonLette}
            </span>
          )}
        </button>
        {$.showNotifiche && (
          <div
            onClick={function (e: any) { e.stopPropagation(); }}
            style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              width: 320, maxHeight: 380, overflow: 'auto',
              background: isLight ? '#ffffff' : 'rgba(13,13,30,.98)', border: isLight ? '1px solid rgba(15,23,42,.12)' : '1px solid rgba(99,102,241,.35)', borderRadius: 14,
              boxShadow: isLight ? '0 12px 32px rgba(15,23,42,.12)' : '0 12px 40px rgba(0,0,0,.6)', zIndex: 400, padding: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 4px 8px', borderBottom: isLight ? '1px solid rgba(15,23,42,.08)' : '1px solid rgba(255,255,255,.08)', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: isLight ? '#0f172a' : 'rgba(255,255,255,.85)', letterSpacing: .5 }}>🔔 NOTIFICHE</span>
              {($.notifiche || []).length > 0 && (
                <span style={{ display: 'flex', gap: 6 }}>
                  <button onClick={function () { $.segnaTutteLette(); }} title="Segna tutte come lette" style={{ background: 'rgba(99,102,241,.15)', border: '1px solid rgba(99,102,241,.3)', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: '#a5b4fc', cursor: 'pointer', fontWeight: 700 }}>Segna già lette</button>
                  <button onClick={function () { if (confirm('Eliminare tutte le notifiche?')) { var dbc:any=(window as any).db; if(dbc) dbc.collection('notifiche').doc($.user.uid).delete(); } }} title="Pulisci notifiche" style={{ background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: '#f87171', cursor: 'pointer', fontWeight: 700 }}>✕</button>
                </span>
              )}
            </div>
            {(!$.notifiche || $.notifiche.length === 0) && (
              <div style={{ textAlign: 'center', padding: 20, color: isLight ? '#64748b' : 'rgba(255,255,255,.4)', fontSize: 12 }}>Nessuna notifica</div>
            )}
            {($.notifiche || []).slice().reverse().slice(0, 30).map(function (n: any) {
              var icon = n.tipo === 'nuova_card' ? '📌' : n.tipo === 'proposta_esito' ? '✅' : n.tipo === 'ammonizione' ? '⚠️' : '💬';
              return (
                <div
                  key={n.id}
                  onClick={function () {
                    $.segnaLetta(n.id);
                    $.setShowNotifiche(false);
                    var card = ($.cards || $.visibleSorted || []).find(function (c: any) { return String(c.id) === String(n.cardId); });
                    if (card && $.openCard) $.openCard(card);
                  }}
                  style={{
                    display: 'flex', gap: 8, padding: '8px 8px', borderRadius: 8, cursor: 'pointer',
                    background: n.letta ? 'transparent' : (isLight ? 'rgba(79,70,229,.08)' : 'rgba(99,102,241,.10)'), border: '1px solid ' + (n.letta ? 'transparent' : (isLight ? 'rgba(79,70,229,.14)' : 'rgba(99,102,241,.18)')),
                    marginBottom: 4, alignItems: 'flex-start',
                  }}
                >
                  <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: n.letta ? 500 : 700, color: n.letta ? (isLight ? '#475569' : 'rgba(255,255,255,.72)') : (isLight ? '#312e81' : '#e0e7ff'), lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.titolo}</div>
                    <div style={{ fontSize: 11, color: isLight ? '#475569' : 'rgba(255,255,255,.5)', lineHeight: 1.4 }}>{n.msg}</div>
                    <div style={{ fontSize: 10, color: isLight ? '#64748b' : 'rgba(255,255,255,.35)', marginTop: 2 }}>{$.timeAgo ? $.timeAgo(n.createdAt) : ''}</div>
                  </div>
                  {!n.letta && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366f1', flexShrink: 0, marginTop: 6 }} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {$.isProf && !$.simulaSt && (
        <button
          aria-label="Cerca nelle card"
          title="Cerca nelle card"
          onClick={function () {
            $.setShowCerca(true);
          }}
          style={{
            background: isLight ? 'rgba(79,70,229,.08)' : 'rgba(99,102,241,.12)',
            border: isLight ? '1px solid rgba(79,70,229,.20)' : '1px solid rgba(99,102,241,.35)',
            borderRadius: 8,
            padding: '5px 9px',
            cursor: 'pointer',
            fontSize: 14,
            color: isLight ? '#4f46e5' : '#a5b4fc',
          }}
        >
          🔍
        </button>
      )}
      {$.isProf && !$.simulaSt && (
        <button
          aria-label="Ammonizioni"
          onClick={function () {
            $.setShowAmm({ autore: null, cardId: null, cmId: null });
          }}
          style={{
            background: isLight ? 'rgba(245,158,11,.10)' : 'rgba(245,158,11,.12)',
            border: isLight ? '1px solid rgba(245,158,11,.22)' : '1px solid rgba(245,158,11,.3)',
            borderRadius: 8,
            padding: '5px 9px',
            cursor: 'pointer',
            fontSize: 14,
            color: isLight ? '#92400e' : '#fbbf24',
          }}
        >
          ⚠️
        </button>
      )}
      {
        <button
          aria-label="QR Code bacheca"
          onClick={function () {
            $.setShowQR(true);
          }}
          style={{
            background: 'rgba(255,255,255,.06)',
            border: '1px solid rgba(255,255,255,.1)',
            borderRadius: 8,
            padding: '5px 9px',
            cursor: 'pointer',
            fontSize: 14,
            color: 'rgba(255,255,255,.7)',
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
            background: $.simulaSt ? 'rgba(249,115,22,.3)' : 'rgba(255,255,255,.07)',
            border: '1px solid ' + ($.simulaSt ? 'rgba(249,115,22,.6)' : 'rgba(255,255,255,.15)'),
            borderRadius: 8,
            padding: '5px 10px',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 700,
            color: $.simulaSt ? '#fb923c' : 'rgba(255,255,255,.6)',
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
            background: 'rgba(255,255,255,.05)',
            borderRadius: 9,
            padding: 3,
            border: '1px solid rgba(255,255,255,.08)',
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
                  background: $.view === t.k ? 'rgba(99,102,241,.4)' : 'transparent',
                  color: $.view === t.k ? '#fff' : 'rgba(255,255,255,.58)',
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
            background: 'rgba(99,102,241,.15)',
            border: '1px solid rgba(99,102,241,.3)',
            borderRadius: 8,
            padding: '4px 9px',
            cursor: 'pointer',
            fontSize: 12,
            color: '#a5b4fc',
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

SB.Header = Header__;
export default Header__;
