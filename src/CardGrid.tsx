// CardGrid.jsx · ScuolaBoard
import CardItem from './CardItem.tsx';
var SB = window.SB || {};
var h = SB.h || React.createElement;

function CardGrid__({ $ }) {
  if ($.cards.length === 0) {
    return (
      <div style={{ padding: '10px 14px 18px' }}>
        {
          <div className="card-grid" style={{ columns: '300px', columnGap: 16 }}>
            {[1, 2, 3, 4, 5, 6].map(function (i) {
              return (
                <div
                  key={i}
                  style={{
                    breakInside: 'avoid',
                    marginBottom: 16,
                    borderRadius: 18,
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,.06)',
                    background: 'rgba(255,255,255,.03)',
                    borderTop: '3px solid rgba(255,255,255,.06)',
                  }}
                >
                  {
                    <div style={{ padding: '12px 14px 10px' }}>
                      {<div className="skeleton" style={{ height: 14, width: '40%', marginBottom: 10 }} />}
                      {<div className="skeleton" style={{ height: 16, width: '80%', marginBottom: 8 }} />}
                      {<div className="skeleton" style={{ height: 11, width: '60%', marginBottom: 4 }} />}
                      {<div className="skeleton" style={{ height: 11, width: '45%' }} />}
                    </div>
                  }
                  {
                    <div style={{ padding: '8px 14px 10px', display: 'flex', gap: 8 }}>
                      {<div className="skeleton" style={{ height: 26, width: 52, borderRadius: 20 }} />}
                      {<div className="skeleton" style={{ height: 26, width: 52, borderRadius: 20 }} />}
                      {<div className="skeleton" style={{ height: 26, width: 90, borderRadius: 20 }} />}
                    </div>
                  }
                </div>
              );
            })}
          </div>
        }
      </div>
    );
  }

  if ($.visibleSorted.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '60px 20px' }}>
        {
          <svg
            width={80}
            height={80}
            viewBox="0 0 80 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ marginBottom: 16, opacity: 0.35 }}
          >
            {
              <rect
                x={8}
                y={12}
                width={64}
                height={52}
                rx={8}
                stroke="rgba(99,102,241,.8)"
                strokeWidth={2}
                fill="rgba(99,102,241,.06)"
              />
            }
            {<rect x={18} y={24} width={30} height={3} rx={2} fill="rgba(99,102,241,.5)" />}
            {<rect x={18} y={32} width={44} height={3} rx={2} fill="rgba(255,255,255,.45)" />}
            {<rect x={18} y={40} width={36} height={3} rx={2} fill="rgba(255,255,255,.15)" />}
            {
              <circle
                cx={60}
                cy={52}
                r={10}
                fill="rgba(99,102,241,.15)"
                stroke="rgba(99,102,241,.4)"
                strokeWidth={1.5}
              />
            }
            {<path d="M56 52h8M60 48v8" stroke="rgba(99,102,241,.6)" strokeWidth={2} strokeLinecap="round" />}
          </svg>
        }
        {
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: 'rgba(255,255,255,.5)' }}>
            {$.filterClasse !== 'tutte' ? 'Nessuna card per la classe ' + $.filterClasse : 'Nessun contenuto visibile'}
          </div>
        }
        {
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', marginBottom: 16 }}>
            {$.filterClasse !== 'tutte'
              ? "Prova a selezionare un'altra classe"
              : 'Le card appariranno qui quando verranno pubblicate'}
          </div>
        }
        {$.filterClasse !== 'tutte' && (
          <button
            onClick={function () {
              $.setFilterClasse('tutte');
            }}
            className="btn btn-ghost btn-sm"
          >
            Mostra tutte le classi
          </button>
        )}
        {$.isProf && (
          <button
            onClick={function () {
              $.setEditMode(null);
              $.setForm(Object.assign({}, FORM0));
              $.setShowModal(true);
            }}
            className="btn btn-primary"
          >
            + Aggiungi la prima card
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="card-grid" style={{ columns: '300px', columnGap: 16 }}>
      {$.visibleSorted.map(function (c) {
        return h(CardItem, { key: c.id, $: $, c: c });
      })}
    </div>
  );
}

SB.CardGrid = CardGrid__;
export default CardGrid__;
