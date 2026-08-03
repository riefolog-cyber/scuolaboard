// TimerModal.tsx  ·  estratto da Modals.tsx (split Fase 2a)
var SB = window.SB || {};
window.SB = SB;
var h = SB.h || React.createElement;
var Fragment = SB.Fragment || React.Fragment;

function TimerModal(props) {
  if (!props.showTimerModal || !props.showCard) return null;
  var showCard = props.showCard;
  var timerInput = props.timerInput;
  var setTimerInput = props.setTimerInput;
  var setShowTimerModal = props.setShowTimerModal;
  var S = props.S || window.S || {};
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.75)',
        zIndex: 400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={function () {
        setShowTimerModal(false);
      }}
    >
      {
        <div
          style={{
            background: 'rgba(15,23,42,.92)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,.11)',
            borderRadius: 20,
            boxShadow: '0 24px 60px rgba(0,0,0,.5)',
            padding: 26,
            maxWidth: 360,
            width: '100%',
          }}
          onClick={function (e) {
            e.stopPropagation();
          }}
        >
          {<div style={{ fontSize: 36, textAlign: 'center', marginBottom: 10 }}>⏰</div>}
          {
            <h3 style={{ margin: '0 0 6px', color: '#f1f5f9', fontSize: 16, fontWeight: 800, textAlign: 'center' }}>
              Imposta scadenza card
            </h3>
          }
          {
            <p style={{ color: 'rgba(255,255,255,.58)', fontSize: 12, marginBottom: 16, textAlign: 'center' }}>
              Gli studenti vedranno un conto alla rovescia nella card.
            </p>
          }
          {
            <input
              type="datetime-local"
              aria-label="Data e ora di scadenza"
              value={timerInput}
              onInput={function (e) {
                setTimerInput(e.target.value);
              }}
              style={Object.assign({}, S.input, { marginBottom: 14, fontSize: 14, colorScheme: 'dark' })}
            />
          }
          {
            <div style={{ display: 'flex', gap: 10 }}>
              {showCard.scadenza && (
                <button
                  onClick={function () {
                    props.setCardTimer(showCard.id, null);
                    setShowTimerModal(false);
                  }}
                  style={{
                    flex: 1,
                    padding: 11,
                    background: 'rgba(239,68,68,.15)',
                    color: '#f87171',
                    border: '1px solid rgba(239,68,68,.3)',
                    borderRadius: 11,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  🗑️ Rimuovi
                </button>
              )}
              {
                <button
                  onClick={function () {
                    setShowTimerModal(false);
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
                    if (timerInput) {
                      props.setCardTimer(showCard.id, new Date(timerInput).toISOString());
                      setShowTimerModal(false);
                    }
                  }}
                  style={{
                    flex: 2,
                    padding: 11,
                    background: timerInput ? 'linear-gradient(135deg,#f59e0b,#f97316)' : 'rgba(255,255,255,.06)',
                    color: timerInput ? '#fff' : 'rgba(255,255,255,.40)',
                    border: 'none',
                    borderRadius: 11,
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: timerInput ? 'pointer' : 'not-allowed',
                  }}
                >
                  ⏰ Imposta
                </button>
              }
            </div>
          }
        </div>
      }
    </div>
  );
}

SB.TimerModal = TimerModal;
export default TimerModal;
