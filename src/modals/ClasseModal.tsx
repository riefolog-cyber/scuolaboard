// ClasseModal.tsx  ·  estratto da Modals.tsx (split Fase 2a)

import { S as SGlobal } from '../app-utils.tsx';
function ClasseModal(props: any) {
  if (!props.showClasseModal) return null;
  var S = props.S || SGlobal;
  var CLASSI_LIST = props.CLASSI_LIST || [];
  var CLASSI_DEFAULT = props.CLASSI_DEFAULT || [];
  var classeColor = props.classeColor;
  var classiCustom = props.classiCustom;
  var classeCorrente = props.classeCorrente; // Valore di display (per-anno + fallback legacy)

  // Disabilita SOLO se la classe per l'ANNO CORRENTE è già stata scelta
  // (fonte di verità per-anno). Uno studente legacy con solo il campo piatto
  // `classe` deve poter scegliere per l'anno attuale: con isDisabled basato su
  // classeCorrente (fallback-inclusivo) resterebbe bloccato con una modale
  // disabilitata ogni volta che il popup si apre.
  var isDisabled = !!(props.user && props.user.classiPerAnno && props.user.classiPerAnno[props.annoScolastico]);

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
        props.setShowClasseModal(false);
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
              {<div style={{ fontSize: 44, marginBottom: 8 }}>🏫</div>}
              {
                <div style={{ fontWeight: 900, color: '#f1f5f9', fontSize: 18, marginBottom: 4 }}>
                  Scegli la tua classe
                </div>
              }
              {
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', lineHeight: 1.6 }}>
                  {isDisabled
                    ? "Hai già scelto la tua classe per quest'anno scolastico."
                    : 'Seleziona la classe a cui appartieni per visualizzare i contenuti dedicati.'}
                </div>
              }
            </div>
          }
          {
            <div style={{ marginBottom: 16 }}>
              {
                <label className="u-label" style={{ display: 'block', marginBottom: 6 }}>
                  LA MIA CLASSE
                </label>
              }
              {isDisabled ? (
                <div
                  style={Object.assign({}, S.input, {
                    fontSize: 14,
                    color: '#f1f5f9',
                    background: 'rgba(255,255,255,.05)',
                    border: '1px solid rgba(255,255,255,.1)',
                  })}
                >
                  {classeCorrente}
                </div>
              ) : (
                <select
                  aria-label="Scegli la tua classe"
                  value={props.classeInput}
                  onInput={function (e: any) {
                    props.setClasseInput(e.target.value);
                  }}
                  style={Object.assign({}, S.input, { fontSize: 14, color: '#f1f5f9', background: '#1c1a2e' })}
                >
                  {<option value="">— Seleziona —</option>}
                  {/* Fix per-anno: mostro SOLO le classi attive dell'anno corrente
                      (CLASSI_LIST = default meno nascoste + custom, già filtrata per
                      anno da AppProvider). Le classi nascoste dal prof non compaiono. */}
                  {CLASSI_LIST.length === 0 && (
                    <option value="__vuoto__" disabled>
                      Nessuna classe attiva per quest'anno
                    </option>
                  )}
                  {CLASSI_LIST.map(function (cl: any) {
                    var isCustom = CLASSI_DEFAULT.indexOf(cl) < 0;
                    var cc = isCustom ? classeColor(cl, classiCustom) : null;
                    return (
                      <option key={cl} value={cl} style={isCustom ? { color: cc } : undefined}>
                        {isCustom ? '★ ' + cl : cl}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          }
          {
            <button
              onClick={function () {
                props.saveClasse();
              }}
              disabled={isDisabled || !props.classeInput}
              style={{
                width: '100%',
                padding: 13,
                background:
                  isDisabled || !props.classeInput
                    ? 'rgba(255,255,255,.06)'
                    : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: isDisabled || !props.classeInput ? 'rgba(255,255,255,.40)' : '#fff',
                border: 'none',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 800,
                cursor: isDisabled || !props.classeInput ? 'not-allowed' : 'pointer',
              }}
            >
              {isDisabled ? '✓ Classe confermata' : '✓ Salva classe'}
            </button>
          }
        </div>
      }
    </div>
  );
}

export default ClasseModal;
