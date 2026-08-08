// QRModal.tsx  ·  estratto da Modals.tsx (split Fase 2a)
var SB = window.SB || {};
window.SB = SB;
var h = SB.h || React.createElement;

function QRModal(props: any) {
  if (!props.showQR) return null;
  var qrUrl = props.qrUrl;
  var setShowQR = props.setShowQR;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.85)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={function () {
        setShowQR(false);
      }}
    >
      {
        <div
          style={{
            background: '#1c1a2e',
            border: '1px solid rgba(99,102,241,.3)',
            borderRadius: 20,
            padding: 28,
            maxWidth: 380,
            width: '100%',
            textAlign: 'center',
          }}
          onClick={function (e: any) {
            e.stopPropagation();
          }}
        >
          {
            <div style={{ fontSize: 40, marginBottom: 12 }}>
              ◆
            </div>
          }
          {
            <h3 style={{ margin: '0 0 4px', color: '#f1f5f9', fontSize: 16, fontWeight: 800 }}>
              QR Code Bacheca
            </h3>
          }
          {
            <p style={{ color: 'rgba(255,255,255,.52)', fontSize: 12, margin: '0 0 20px' }}>
              Scannerizza per accedere alla bacheca dal tuo dispositivo
            </p>
          }
          {
            <div
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: 14,
                display: 'inline-block',
                boxShadow: '0 8px 40px rgba(0,0,0,.4)',
              }}
            >
              {<img src={qrUrl} alt="QR Code" style={{ width: 220, height: 220, display: 'block' }} />}
            </div>
          }
          {
            <button
              onClick={function () {
                setShowQR(false);
              }}
              style={{
                marginTop: 20,
                padding: '10px 24px',
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: '#fff',
                border: 'none',
                borderRadius: 11,
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Chiudi
            </button>
          }
        </div>
      }
    </div>
  );
}

export default QRModal;
