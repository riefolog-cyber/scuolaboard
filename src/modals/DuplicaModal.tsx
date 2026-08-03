// DuplicaModal.tsx  ·  estratto da Modals.tsx (split Fase 2a)
var SB = window.SB || {};
window.SB = SB;
var h = SB.h || React.createElement;
var Fragment = SB.Fragment || React.Fragment;

function DuplicaModal(props) {
  if (!props.showDuplica) return null;
  var card = props.showDuplica;
  var CLASSI_LIST = props.CLASSI_LIST || [];
  var duplicaClassi = props.duplicaClassi || [];
  var setDuplicaClassi = props.setDuplicaClassi;
  var setShowDuplica = props.setShowDuplica;
  var confermaDuplica = props.confermaDuplica;

  function toggleCl(cl) {
    if (!setDuplicaClassi) return;
    setDuplicaClassi(function (p) {
      return p.indexOf(cl) >= 0
        ? p.filter(function (x) {
            return x !== cl;
          })
        : p.concat([cl]);
    });
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.7)',
        backdropFilter: 'blur(6px)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={function () {
        setShowDuplica && setShowDuplica(null);
      }}
    >
      {
        <div
          style={{
            background: '#1c1a2e',
            border: '1px solid rgba(245,158,11,.3)',
            borderRadius: 20,
            padding: 24,
            maxWidth: 440,
            width: '100%',
            boxShadow: '0 24px 60px rgba(0,0,0,.5)',
          }}
          onClick={function (e) {
            e.stopPropagation();
          }}
        >
          {
            <div style={{ fontSize: 34, marginBottom: 8 }}>
              📋
            </div>
          }
          {
            <h3 style={{ margin: '0 0 4px', color: '#f1f5f9', fontSize: 16, fontWeight: 800 }}>
              Duplica card
            </h3>
          }
          {
            <p style={{ color: 'rgba(255,255,255,.52)', fontSize: 12, margin: '0 0 6px', lineHeight: 1.5 }}>
              {'"' + (card.titolo || '') + '"'}
            </p>
          }
          {
            <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 11, margin: '0 0 12px' }}>
              Seleziona le classi in cui duplicare la card (commenti e voti non vengono copiati)
            </p>
          }
          {
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
              {CLASSI_LIST.map(function (cl) {
                var sel = duplicaClassi.indexOf(cl) >= 0;
                return (
                  <button
                    key={cl}
                    onClick={function () {
                      toggleCl(cl);
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 20,
                      border: '1px solid ' + (sel ? '#f59e0b' : 'rgba(255,255,255,.15)'),
                      background: sel ? 'rgba(245,158,11,.25)' : 'rgba(255,255,255,.05)',
                      color: sel ? '#fbbf24' : 'rgba(255,255,255,.6)',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {cl}
                  </button>
                );
              })}
            </div>
          }
          {
            <div style={{ display: 'flex', gap: 8 }}>
              {
                <button
                  onClick={function () {
                    setShowDuplica && setShowDuplica(null);
                  }}
                  style={{
                    flex: 1,
                    padding: 11,
                    background: 'rgba(255,255,255,.08)',
                    color: 'rgba(255,255,255,.6)',
                    border: 'none',
                    borderRadius: 11,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Annulla
                </button>
              }
              {
                <button
                  disabled={!duplicaClassi.length}
                  onClick={function () {
                    confermaDuplica && confermaDuplica();
                  }}
                  style={{
                    flex: 1,
                    padding: 11,
                    border: 'none',
                    borderRadius: 11,
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: duplicaClassi.length ? 'pointer' : 'not-allowed',
                    background: duplicaClassi.length
                      ? 'linear-gradient(135deg,#f59e0b,#f97316)'
                      : 'rgba(255,255,255,.06)',
                    color: duplicaClassi.length ? '#fff' : 'rgba(255,255,255,.25)',
                  }}
                >
                  {'Duplica in ' + duplicaClassi.length + ' classe' + (duplicaClassi.length === 1 ? '' : 'i')}
                </button>
              }
            </div>
          }
        </div>
      }
    </div>
  );
}

SB.DuplicaModal = DuplicaModal;
export default DuplicaModal;
