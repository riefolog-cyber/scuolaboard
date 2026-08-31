// LoginScreen.jsx · ScuolaBoard

function LoginScreen__({ $ }: any) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg,#12111a 0%,#161320 50%,#1a1528 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            left: '-10%',
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'radial-gradient(circle,rgba(99,102,241,.18) 0%,transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      }
      {
        <div
          style={{
            position: 'absolute',
            bottom: '-15%',
            right: '-5%',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle,rgba(139,92,246,.14) 0%,transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      }
      {
        <div
          style={{
            position: 'absolute',
            top: '30%',
            right: '15%',
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle,rgba(34,197,94,.08) 0%,transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      }
      {
        <div
          style={{
            background: 'rgba(255,255,255,.05)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,.12)',
            borderRadius: 28,
            padding: '40px 36px',
            width: '100%',
            maxWidth: 420,
            textAlign: 'center',
            boxShadow: '0 32px 80px rgba(0,0,0,.4)',
            position: 'relative',
          }}
        >
          {
            <div style={{ marginBottom: 24 }}>
              {
                <div style={{ fontSize: 52, marginBottom: 12, filter: 'drop-shadow(0 0 20px rgba(99,102,241,.5))' }}>
                  🎓
                </div>
              }
              {
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 6 }}
                >
                  {<span style={{ fontWeight: 900, fontSize: 28, color: '#fff', letterSpacing: 2 }}>SCUOLA</span>}
                  {
                    <span
                      style={{
                        fontWeight: 900,
                        fontSize: 28,
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
                <p style={{ margin: 0, color: 'rgba(255,255,255,.45)', fontSize: 13, letterSpacing: 0.5 }}>
                  Bacheca digitale interattiva con AI
                </p>
              }
            </div>
          }
          {
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 28, flexWrap: 'wrap' }}>
              {['🤖 AI integrata', '🗳️ Sondaggi', '🧩 Quiz', '💬 Commenti'].map(function (label, i) {
                return (
                  <span
                    key={i}
                    style={{
                      background: 'rgba(99,102,241,.12)',
                      border: '1px solid rgba(99,102,241,.2)',
                      borderRadius: 20,
                      padding: '3px 10px',
                      fontSize: 11,
                      color: 'rgba(255,255,255,.6)',
                      fontWeight: 600,
                    }}
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          }
          {
            <button
              onClick={$.loginGoogle}
              style={{
                padding: '14px 20px',
                background: '#fff',
                border: 'none',
                borderRadius: 14,
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 700,
                color: '#1a1a2e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                width: '100%',
                boxShadow: '0 4px 20px rgba(0,0,0,.3)',
                transition: 'transform .15s,box-shadow .15s',
              }}
            >
              {
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  width={20}
                  height={20}
                  alt="G"
                />
              }
              Accedi con Google
            </button>
          }
          {
            <div
              style={{
                marginTop: 16,
                color: 'rgba(255,255,255,.40)',
                fontSize: 11,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
              }}
            >
              🔒 Accesso sicuro tramite Google
            </div>
          }
        </div>
      }
    </div>
  );
}

export default LoginScreen__;
