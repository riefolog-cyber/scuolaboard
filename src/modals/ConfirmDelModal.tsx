// ConfirmDelModal.tsx  ·  estratto da Modals.tsx (split Fase 2a)

function ConfirmDelModal(props: any) {
  var confirmDel = props.confirmDel;
  var setConfirmDel = props.setConfirmDel;
  var delCardWithUndo = props.delCardWithUndo;
  var executeDelCom = props.executeDelCom;
  var executeDelReply = props.executeDelReply;
  var resetRisposte = props.resetRisposte;
  var togliDaClasse = props.togliDaClasse;
  if (!confirmDel) return null;
  var isComment = confirmDel.type === 'comment';
  var isReply = confirmDel.type === 'reply';
  var isQuizReset = confirmDel.type === 'quiz_reset';
  // Classe selezionata nel filtro: il docente sta guardando quella classe, e il
  // suo "Elimina" vale per quella. Presente solo se la card raggiunge anche
  // altre classi (vedi eliminabileSoloDaClasse), quindi i due pulsanti qui
  // corrispondono a due esiti DIVERSI e non a una scelta finta.
  var soloDa = confirmDel.soloDaClasse || null;
  var modalTitle = isQuizReset
    ? 'Reset risposte quiz'
    : 'Elimina ' + (isComment ? 'commento' : isReply ? 'risposta' : 'card');
  var modalMessage = isQuizReset
    ? "Vuoi davvero eliminare TUTTE le risposte al quiz? L'operazione è irreversibile."
    : soloDa
      ? 'Questa card vale per più classi. Vuoi toglierla solo dalla classe ' +
        soloDa +
        ' o eliminarla del tutto?'
      : 'Vuoi davvero eliminare ' +
        (isComment ? 'questo commento' : isReply ? 'questa risposta' : 'questa card') +
        // Solo l'eliminazione card ha l'undo (toast con "Annulla"): per commenti e
        // risposte l'operazione è subito persistita su Firestore, niente recupero.
        (isComment || isReply ? "? L'operazione è irreversibile." : "? L'azione può essere annullata entro 5 secondi.");
  var confirmAction = function () {
    if (isQuizReset) {
      resetRisposte(confirmDel.cardId);
    } else if (isComment) {
      executeDelCom(confirmDel.cardId, confirmDel.id);
    } else if (isReply) {
      // Ordine parametri di executeDelReply: (cmId, rId, cardId)
      executeDelReply(confirmDel.cmId, confirmDel.id, confirmDel.cardId);
    } else {
      delCardWithUndo(confirmDel.id);
    }
    setConfirmDel(null);
  };
  // Percorso "solo da questa classe": non cancella il documento, esclude la
  // classe. Reversibile e lascia intatte le altre classi.
  var soloDaClasseAction = function () {
    togliDaClasse(confirmDel.id, soloDa);
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
          onClick={function (e: any) {
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
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
                  {soloDa ? '🗑️ Elimina da tutte' : '🗑️ Elimina'}
                </button>
              }
            </div>
          }
          {
            // Secondo esito possibile: la card resta per le altre classi.
            // Sta in una riga propria perché il testo ("Solo da " + classe) non
            // entra nello spazio dei due pulsanti sopra senza spezzarli.
            soloDa && (
              <button
                onClick={soloDaClasseAction}
                style={{
                  marginTop: 10,
                  width: '100%',
                  padding: 11,
                  background: 'rgba(99,102,241,.18)',
                  color: '#c4b5fd',
                  border: '1px solid rgba(99,102,241,.45)',
                  borderRadius: 11,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Solo dalla classe {soloDa}
              </button>
            )
          }
        </div>
      }
    </div>
  );
}

export default ConfirmDelModal;
