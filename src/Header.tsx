// Header.jsx · ScuolaBoard
var SB = window.SB || {};
var h = SB.h || React.createElement;

function Header__({ $ }: any) {
  return (
    <div
      className="scuola-header"
      style={{
        background: 'rgba(15,20,40,.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(99,102,241,.18)',
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        position: 'sticky',
        top: 0,
        zIndex: 50,
        flexWrap: 'wrap',
        boxShadow: '0 2px 20px rgba(0,0,0,.3)',
      }}
    >
      {
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {<span style={{ fontWeight: 900, fontSize: 16, color: '#fff', letterSpacing: 2 }}>SCUOLA</span>}
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
      {!$.isProf && !(($.user.classiPerAnno || {})[$.annoScolastico]) && (
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
      {!$.isProf && !(($.user.classiPerAnno || {})[$.annoScolastico]) && (
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
      {$.isProf && !$.simulaSt && (
        <button
          aria-label="Cerca nelle card"
          title="Cerca nelle card"
          onClick={function () {
            $.setShowCerca(true);
          }}
          style={{
            background: 'rgba(99,102,241,.12)',
            border: '1px solid rgba(99,102,241,.35)',
            borderRadius: 8,
            padding: '5px 9px',
            cursor: 'pointer',
            fontSize: 14,
            color: '#a5b4fc',
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
            background: 'rgba(245,158,11,.12)',
            border: '1px solid rgba(245,158,11,.3)',
            borderRadius: 8,
            padding: '5px 9px',
            cursor: 'pointer',
            fontSize: 14,
            color: '#fbbf24',
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
