// EditAmmModal.tsx  ·  estratto da Modals.tsx (split Fase 2a)

import { S as SGlobal } from '../app-utils.tsx';
function EditAmmModal(props: any) {
  if (!props.editAmm) return null;
  var editAmm = props.editAmm;
  var setEditAmm = props.setEditAmm;
  var S = props.S || SGlobal;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.8)',
        zIndex: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={function () {
        setEditAmm(null);
      }}
    >
      {
        <div
          style={{
            background: '#1c1a2e',
            border: '1px solid rgba(245,158,11,.3)',
            borderRadius: 20,
            padding: 24,
            maxWidth: 380,
            width: '100%',
          }}
          onClick={function (e: any) {
            e.stopPropagation();
          }}
        >
          {
            <h3 style={{ margin: '0 0 4px', color: '#fbbf24', fontSize: 15, fontWeight: 800 }}>
              ✏️ Modifica ammonizione
            </h3>
          }
          {
            <p style={{ color: 'rgba(255,255,255,.58)', fontSize: 11, marginBottom: 14 }}>
              {'Studente: ' + editAmm.nome}
            </p>
          }
          {
            <textarea
              id="editamm-input"
              aria-label="Motivazione ammonizione"
              rows={3}
              defaultValue={editAmm.motivazione}
              style={Object.assign({}, S.input, { resize: 'none', fontSize: 12, marginBottom: 12 })}
            />
          }
          {
            <div style={{ display: 'flex', gap: 8 }}>
              {
                <button
                  onClick={function () {
                    setEditAmm(null);
                  }}
                  style={{
                    flex: 1,
                    padding: 10,
                    background: 'rgba(255,255,255,.07)',
                    color: 'rgba(255,255,255,.65)',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 12,
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
                    var val = ((document.getElementById('editamm-input') || {}) as any)['value'];
                    if (val) val = val.trim();
                    if (val) {
                      props.modificaAmm(editAmm.nome, editAmm.id, val);
                      // FIX (bug E2E): la modale si chiude da sola dopo il salvataggio,
                      // come tutte le altre modali di conferma. Prima restava aperta
                      // e l'overlay z-600 bloccava i click sull'intera UI.
                      setEditAmm(null);
                    }
                  }}
                  style={{
                    flex: 2,
                    padding: 10,
                    background: 'linear-gradient(135deg,#f59e0b,#f97316)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  ✓ Salva modifica
                </button>
              }
            </div>
          }
        </div>
      }
    </div>
  );
}

export default EditAmmModal;
