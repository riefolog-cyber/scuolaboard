// PrivacyModal.tsx  ·  estratto da Modals.tsx (split Fase 2a)
// Esteso: mostra procedura privacy completa quando showPrivacyInfo è attivo
var SB = window.SB || {};
window.SB = SB;
var h = SB.h || React.createElement;

function PrivacyModal(props: any) {
  var isInfo = props.showPrivacyInfo;
  var isOpen = props.showPrivacy || isInfo;

  if (!isOpen) return null;

  // Modal "Prima di iniziare" — prima accettazione
  if (!isInfo) {
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

  // Modal informativa privacy — spiegazione procedura AI
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
      onClick={function () {
        props.setShowPrivacyInfo(false);
      }}
    >
      <div
        style={{
          background: '#1c1a2e',
          border: '1px solid rgba(99,102,241,.3)',
          borderRadius: 20,
          padding: '28px 24px',
          maxWidth: 520,
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
        onClick={function (e: any) {
          e.stopPropagation();
        }}
      >
        {/* Titolo */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🛡️</div>
          <div style={{ fontWeight: 900, color: '#f1f5f9', fontSize: 18, marginBottom: 4 }}>
            La tua privacy è protetta
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
            Come ScuolaBoard tutela i dati dei studenti
          </div>
        </div>

        {/* Step 1 */}
        <div style={infoCardStyle}>
          <div style={infoStepStyle}>
            <span style={{ background: '#6366f1', color: '#fff', borderRadius: 8, padding: '2px 8px', fontSize: 11, fontWeight: 800 }}>
              1
            </span>
            <span style={{ fontWeight: 700, color: '#c7d2fe' }}>Anonimizzazione automatica</span>
          </div>
          <p style={infoTextStyle}>
            Prima di inviare i commenti all'IA, i nomi degli studenti vengono automaticamente sostituiti con identificativi fittizi (Studente 1, Studente 2…). L'IA esterna non sa mai chi ha scritto cosa.
          </p>
        </div>

        {/* Step 2 */}
        <div style={infoCardStyle}>
          <div style={infoStepStyle}>
            <span style={{ background: '#8b5cf6', color: '#fff', borderRadius: 8, padding: '2px 8px', fontSize: 11, fontWeight: 800 }}>
              2
            </span>
            <span style={{ fontWeight: 700, color: '#c7d2fe' }}>Trasparenza totale</span>
          </div>
          <p style={infoTextStyle}>
            Ogni contenuto generato dall'IA è contrassegnato dal badge "Supporto IA – revisionato dal docente". Saprai sempre quando un contenuto è stato prodotto con supporto artificiale.
          </p>
        </div>

        {/* Step 3 */}
        <div style={infoCardStyle}>
          <div style={infoStepStyle}>
            <span style={{ background: '#a855f7', color: '#fff', borderRadius: 8, padding: '2px 8px', fontSize: 11, fontWeight: 800 }}>
              3
            </span>
            <span style={{ fontWeight: 700, color: '#c7d2fe' }}>Controllo umano</span>
          </div>
          <p style={infoTextStyle}>
            Nessuna valutazione è mai automatica. I quiz generati dall'IA sono sempre bozze che il docente revisiona prima di pubblicare. L'IA supporta, il docente decide.
          </p>
        </div>

        {/* Step 4 */}
        <div style={infoCardStyle}>
          <div style={infoStepStyle}>
            <span style={{ background: '#ec4899', color: '#fff', borderRadius: 8, padding: '2px 8px', fontSize: 11, fontWeight: 800 }}>
              4
            </span>
            <span style={{ fontWeight: 700, color: '#c7d2fe' }}>Dati mai esposti</span>
          </div>
          <p style={infoTextStyle}>
            Le chiavi API e i dati sensibili non sono mai nel browser. Le chiamate IA passano da un proxy sicuro che protegge le credenziali.
          </p>
        </div>

        {/* Nota legale */}
        <div style={{
          marginTop: 16,
          padding: '10px 14px',
          background: 'rgba(99,102,241,.08)',
          border: '1px solid rgba(99,102,241,.15)',
          borderRadius: 10,
          fontSize: 11,
          color: 'rgba(255,255,255,.45)',
          lineHeight: 1.5,
        }}>
          Conforme al Regolamento IA d'Istituto, AI Act (Art. 50) e GDPR (Art. 4 par. 5). Per maggiori dettagli, consulta l'InformativaPrivacy d'Istituto.
        </div>

        {/* Pulsante chiudi */}
        <button
          onClick={function () {
            props.setShowPrivacyInfo(false);
          }}
          style={{
            width: '100%',
            marginTop: 16,
            padding: 12,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ✕ Chiudi
        </button>
      </div>
    </div>
  );
}

// Stili condivisi per le card informative
var infoCardStyle: any = {
  background: 'rgba(255,255,255,.04)',
  border: '1px solid rgba(255,255,255,.08)',
  borderRadius: 12,
  padding: '12px 14px',
  marginBottom: 10,
};
var infoStepStyle: any = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 6,
};
var infoTextStyle: any = {
  fontSize: 12,
  color: 'rgba(255,255,255,.7)',
  lineHeight: 1.6,
  margin: 0,
};

export default PrivacyModal;
