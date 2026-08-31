import { S as SGlobal } from '../app-utils.tsx';
// RifiutaModal.tsx  ·  estratto da Modals.tsx (split Fase 2a)

function RifiutaModal(props: any) {
  if (!props.showRifiutaModal) return null;
  var setShowRifiutaModal = props.setShowRifiutaModal;
  var rifiutaInput = props.rifiutaInput;
  var setRifiutaInput = props.setRifiutaInput;
  var S = props.S || SGlobal;
  var showRifiutaModal = props.showRifiutaModal;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.82)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={function () {
        setShowRifiutaModal(null);
        setRifiutaInput('');
      }}
    >
      {
        <div
          style={{
            background: '#1c1a2e',
            border: '1px solid rgba(239,68,68,.35)',
            borderRadius: 20,
            padding: 26,
            maxWidth: 360,
            width: '100%',
          }}
          onClick={function (e: any) {
            e.stopPropagation();
          }}
        >
          {<div style={{ fontSize: 36, textAlign: 'center', marginBottom: 8 }}>❌</div>}
          {
            <h3 style={{ margin: '0 0 4px', color: '#f87171', fontSize: 15, fontWeight: 800, textAlign: 'center' }}>
              Rifiuta proposta
            </h3>
          }
          {
            <p
              style={{
                color: 'rgba(255,255,255,.45)',
                fontSize: 12,
                marginBottom: 14,
                textAlign: 'center',
                lineHeight: 1.5,
              }}
            >
              {showRifiutaModal && showRifiutaModal.titolo}
            </p>
          }
          {
            <label className="u-label" style={{ display: 'block', marginBottom: 6 }}>
              MOTIVAZIONE (opzionale)
            </label>
          }
          {
            <textarea
              value={rifiutaInput}
              aria-label="Motivazione del rifiuto"
              onInput={function (e: any) {
                setRifiutaInput(e.target.value);
              }}
              rows={3}
              placeholder="Es. Argomento già trattato, fuori tema…"
              style={Object.assign({}, S.input, { resize: 'vertical', marginBottom: 14 })}
            />
          }
          {
            <div style={{ display: 'flex', gap: 10 }}>
              {
                <button
                  onClick={function () {
                    setShowRifiutaModal(null);
                    setRifiutaInput('');
                  }}
                  style={{
                    flex: 1,
                    padding: 11,
                    background: 'rgba(255,255,255,.08)',
                    color: 'rgba(255,255,255,.6)',
                    border: 'none',
                    borderRadius: 11,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Annulla
                </button>
              }
              {
                <button
                  onClick={function () {
                    props.rifiutaConMot(showRifiutaModal.id, rifiutaInput);
                  }}
                  style={{
                    flex: 2,
                    padding: 11,
                    background: 'linear-gradient(135deg,#ef4444,#f87171)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 11,
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  ❌ Rifiuta
                </button>
              }
            </div>
          }
        </div>
      }
    </div>
  );
}

export default RifiutaModal;
