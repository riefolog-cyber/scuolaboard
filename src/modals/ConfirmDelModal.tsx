// ConfirmDelModal.tsx  ·  estratto da Modals.tsx (split Fase 2a)
var SB = window.SB || {};
window.SB = SB;
var h = SB.h || React.createElement;
var Fragment = SB.Fragment || React.Fragment;

function ConfirmDelModal(props) {
  var confirmDel = props.confirmDel;
  var setConfirmDel = props.setConfirmDel;
  var delCardWithUndo = props.delCardWithUndo;
  var executeDelCom = props.executeDelCom;
  var executeDelReply = props.executeDelReply;
  if (!confirmDel) return null;
  var isComment = confirmDel.type === 'comment';
  var isReply = confirmDel.type === 'reply';
  var modalTitle = 'Elimina ' + (isComment ? 'commento' : isReply ? 'risposta' : 'card');
  var modalMessage =
    'Vuoi davvero eliminare ' +
    (isComment ? 'questo commento' : isReply ? 'questa risposta' : 'questa card') +
    "? L'azione può essere annullata entro 5 secondi.";
  var confirmAction = function () {
    if (isComment) {
      executeDelCom(confirmDel.cardId, confirmDel.id);
    } else if (isReply) {
      executeDelReply(confirmDel.cardId, confirmDel.cmId, confirmDel.id);
    } else {
      delCardWithUndo(confirmDel.id);
    }
    setConfirmDel(null);
  };
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
        setConfirmDel(null);
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
          onClick={function (e) {
            e.stopPropagation();
          }}
        >
          {
            <h3 style={{ margin: '0 0 4px', color: '#f87171', fontSize: 15, fontWeight: 800, textAlign: 'center' }}>
              {modalTitle}
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
              {modalMessage}
            </p>
          }
          {
            <div style={{ display: 'flex', gap: 10 }}>
              {
                <button
                  onClick={function () {
                    setConfirmDel(null);
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
                  onClick={confirmAction}
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
                  🗑️ Elimina
                </button>
              }
            </div>
          }
        </div>
      }
    </div>
  );
}

SB.ConfirmDelModal = ConfirmDelModal;
export default ConfirmDelModal;
