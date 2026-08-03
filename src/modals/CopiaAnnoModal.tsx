// CopiaAnnoModal.tsx  ·  estratto da Modals.tsx (split Fase 2a)
var SB = window.SB || {};
window.SB = SB;
var h = SB.h || React.createElement;
var Fragment = SB.Fragment || React.Fragment;

function CopiaAnnoModal(props) {
  if (!props.showCopiaAnno) return null;
  var card = props.showCopiaAnno;
  var ANNI = props.ANNI_DISPONIBILI || [];
  var copiaAnnoTarget = props.copiaAnnoTarget || '';
  var setCopiaAnnoTarget = props.setCopiaAnnoTarget;
  var setShowCopiaAnno = props.setShowCopiaAnno;
  var confermaCopiaAnno = props.confermaCopiaAnno;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.7)',
        backdropFilter: 'blur(6px)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={function () {
        setShowCopiaAnno && setShowCopiaAnno(null);
      }}
    >
      {
        <div
          style={{
            background: '#1c1a2e',
            border: '1px solid rgba(139,92,246,.3)',
            borderRadius: 20,
            padding: 24,
            maxWidth: 420,
            width: '100%',
            boxShadow: '0 24px 60px rgba(0,0,0,.5)',
          }}
          onClick={function (e) {
            e.stopPropagation();
          }}
        >
          {
            <div style={{ fontSize: 34, marginBottom: 8 }}>
              📅
            </div>
          }
          {
            <h3 style={{ margin: '0 0 4px', color: '#f1f5f9', fontSize: 16, fontWeight: 800 }}>
              Copia in altro anno
            </h3>
          }
          {
            <p style={{ color: 'rgba(255,255,255,.52)', fontSize: 12, margin: '0 0 6px', lineHeight: 1.5 }}>
              {'"' + (card.titolo || '') + '"'}
            </p>
          }
          {
            <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 11, margin: '0 0 12px' }}>
              La copia sarà creata nascosta nel nuovo anno, senza commenti e voti
            </p>
          }
          {
            <label className="u-label" style={{ display: 'block', marginBottom: 6 }}>
              ANNO SCOLASTICO
            </label>
          }
          {
            <select
              aria-label="Anno scolastico di destinazione"
              value={copiaAnnoTarget}
              onChange={function (e) {
                setCopiaAnnoTarget && setCopiaAnnoTarget(e.target.value);
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid rgba(255,255,255,.15)',
                borderRadius: 10,
                fontSize: 13,
                background: 'rgba(255,255,255,.08)',
                color: '#f1f5f9',
                marginBottom: 18,
              }}
            >
              {
                <option value="" disabled style={{ color: 'rgba(255,255,255,.4)' }}>
                  Seleziona anno…
                </option>
              }
              {ANNI.map(function (a) {
                return (
                  <option key={a} value={a} style={{ background: '#1c1a2e', color: '#f1f5f9' }}>
                    {a}
                  </option>
                );
              })}
            </select>
          }
          {
            <div style={{ display: 'flex', gap: 8 }}>
              {
                <button
                  onClick={function () {
                    setShowCopiaAnno && setShowCopiaAnno(null);
                  }}
                  style={{
                    flex: 1,
                    padding: 11,
                    background: 'rgba(255,255,255,.08)',
                    color: 'rgba(255,255,255,.6)',
                    border: 'none',
                    borderRadius: 11,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Annulla
                </button>
              }
              {
                <button
                  disabled={!copiaAnnoTarget}
                  onClick={function () {
                    confermaCopiaAnno && confermaCopiaAnno();
                  }}
                  style={{
                    flex: 1,
                    padding: 11,
                    border: 'none',
                    borderRadius: 11,
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: copiaAnnoTarget ? 'pointer' : 'not-allowed',
                    background: copiaAnnoTarget
                      ? 'linear-gradient(135deg,#8b5cf6,#a855f7)'
                      : 'rgba(255,255,255,.06)',
                    color: copiaAnnoTarget ? '#fff' : 'rgba(255,255,255,.25)',
                  }}
                >
                  Copia
                </button>
              }
            </div>
          }
        </div>
      }
    </div>
  );
}

SB.CopiaAnnoModal = CopiaAnnoModal;
export default CopiaAnnoModal;
