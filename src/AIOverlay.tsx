// AIOverlay.jsx · ScuolaBoard

function AIOverlay__({ $ }: any) {
  if (!($.aiRunning || $.cardAiLoad || $.cardQLoad || $.sommarioLoading || $.sondaggioAiLoading)) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(10,10,20,.45)',
        backdropFilter: 'blur(2px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {
        <div
          className="glass-panel"
          style={{
            borderRadius: 18,
            padding: '22px 30px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 24px 70px rgba(0,0,0,.6)',
            border: '1px solid rgba(99,102,241,.35)',
          }}
        >
          {
            <div
              style={{
                width: 42,
                height: 42,
                border: '3px solid rgba(99,102,241,.2)',
                borderTop: '3px solid #6366f1',
                borderRight: '3px solid #a855f7',
                borderRadius: '50%',
                animation: 'spin .9s linear infinite',
              }}
            />
          }
          {<div style={{ color: '#e0e7ff', fontWeight: 700, fontSize: 15, letterSpacing: 0.3 }}>AI in azione…</div>}
          {
            <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 12, textAlign: 'center' }}>
              L'elaborazione può richiedere qualche secondo
            </div>
          }
        </div>
      }
    </div>
  );
}
export default AIOverlay__;
