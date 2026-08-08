// PrivacyModal.tsx  ·  estratto da Modals.tsx (split Fase 2a)
var SB = window.SB || {};
window.SB = SB;
var h = SB.h || React.createElement;

function PrivacyModal(props: any) {
  if (!props.showPrivacy) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.92)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      {
        <div
          style={{
            background: '#1c1a2e',
            border: '1px solid rgba(99,102,241,.3)',
            borderRadius: 20,
            padding: 28,
            maxWidth: 440,
            width: '100%',
          }}
          onClick={function (e: any) {
            e.stopPropagation();
          }}
        >
          {
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              {<div style={{ fontSize: 44, marginBottom: 8 }}>🔒</div>}
              {
                <div style={{ fontWeight: 900, color: '#f1f5f9', fontSize: 18, marginBottom: 4 }}>
                  Prima di iniziare
                </div>
              }
              {
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', lineHeight: 1.6 }}>
                  Questa bacheca è uno strumento didattico del tuo insegnante.
                </div>
              }
            </div>
          }
          {
            <button
              onClick={function () {
                SB.LS.privacy.set(props.user.uid);
                props.setShowPrivacy(false);
              }}
              style={{
                width: '100%',
                padding: 13,
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              ✓ Ho capito, accetto
            </button>
          }
        </div>
      }
    </div>
  );
}

export default PrivacyModal;
