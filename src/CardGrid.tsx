// CardGrid.jsx · ScuolaBoard
import CardItem from './CardItem.tsx';
import { FORM0 } from './app-utils.tsx';

// Griglia ROW-MAJOR (riga per riga, da sinistra a destra).
// Prima si usavano le colonne CSS (masonry): riempiono una colonna dall'alto in
// basso, quindi le card prioritarie (fissate, poi aperte di recente) finivano
// IMPILATE in verticale nella prima colonna e la priorità non si leggeva come
// "prima riga". Con il grid l'ordine di visibleSorted si legge da sinistra a
// destra. `alignItems: start` evita che le card basse vengano allungate a
// riempire l'altezza della riga.
export const GRID_STYLE = {
  display: 'grid',
  // min(300px, 100%) evita lo scroll orizzontale su schermi stretti (< 300px).
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
  gap: 16,
  alignItems: 'start',
} as const;

function CardGrid__({ $ }: any) {
  // Skeleton SOLO durante il caricamento. Una volta caricate le card (anche
  // se zero), si scende allo stato vuoto → mai scheletri sur un account nuovo.
  if ($.cards.length === 0 && $.cardsLoaded !== true) {
    return (
      <div style={{ padding: '10px 14px 18px' }}>
        {
          <div className="card-grid" style={GRID_STYLE}>
            {' '}
            {Array.from({ length: Math.max(6, Math.ceil((typeof window !== 'undefined' ? window.innerWidth : 1200) / 320) * 2) }, function (_, i) { return i + 1; }).map(function (i: number) {
              // Skeleton fedele alla card vera (chip + titolo + due righe +
              // pillole): lo stacco al caricamento si nota molto meno.
              return (
                <div
                  key={i}
                  style={{
                    borderRadius: 18,
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,.06)',
                    background: 'rgba(255,255,255,.03)',
                    borderTop: '3px solid rgba(255,255,255,.08)',
                  }}
                >
                  {
                    <div
                      style={{
                        padding: '12px 14px 6px',
                        background: 'linear-gradient(180deg,rgba(255,255,255,.04) 0%, transparent 65%)',
                      }}
                    >
                      {
                        <div
                          className="skeleton"
                          style={{ height: 18, width: 78, borderRadius: 20, marginBottom: 10 }}
                        />
                      }
                      {<div className="skeleton" style={{ height: 15, width: '85%', marginBottom: 7 }} />}
                      {<div className="skeleton" style={{ height: 11, width: '95%', marginBottom: 4 }} />}
                      {<div className="skeleton" style={{ height: 11, width: '60%' }} />}
                    </div>
                  }
                  {
                    <div style={{ padding: '8px 14px 10px', display: 'flex', gap: 8 }}>
                      {<div className="skeleton" style={{ height: 24, width: 46, borderRadius: 20 }} />}
                      {<div className="skeleton" style={{ height: 24, width: 84, borderRadius: 20 }} />}
                      {<div className="skeleton" style={{ height: 24, width: 28, borderRadius: 20 }} />}
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
    var filtroAttivo = $.filterClasse !== 'tutte';
    return (
      <div className="empty-state" style={{ padding: '56px 20px 64px', gap: 10 }}>
        {
          <div
            aria-hidden="true"
            style={{
              width: 88,
              height: 88,
              borderRadius: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(145deg, rgba(var(--c-primary-rgb),.16), rgba(var(--c-primary-rgb),.04))',
              border: '1px solid rgba(var(--c-primary-rgb),.18)',
              marginBottom: 6,
              boxShadow: '0 10px 30px rgba(0,0,0,.18)',
            }}
          >
            <svg width={42} height={42} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x={8} y={12} width={64} height={52} rx={8} stroke="rgba(var(--c-primary-rgb),.85)" strokeWidth={2.5} fill="rgba(var(--c-primary-rgb),.08)" />
              <rect x={18} y={24} width={30} height={3.5} rx={2} fill="rgba(var(--c-primary-rgb),.55)" />
              <rect x={18} y={33} width={44} height={3.5} rx={2} fill="rgba(255,255,255,.5)" />
              <rect x={18} y={42} width={36} height={3.5} rx={2} fill="rgba(255,255,255,.22)" />
              <circle cx={60} cy={52} r={10} fill="rgba(var(--c-primary-rgb),.18)" stroke="rgba(var(--c-primary-rgb),.45)" strokeWidth={1.5} />
              <path d="M56 52h8M60 48v8" stroke="rgba(var(--c-primary-rgb),.7)" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </div>
        }
        {
          <div className="empty-state-title" style={{ textAlign: 'center' }}>
            {filtroAttivo ? 'Nessuna card per la classe ' + $.filterClasse : 'Nessun contenuto visibile'}
          </div>
        }
        {
          <div className="empty-state-sub" style={{ marginBottom: 10 }}>
            {filtroAttivo
              ? 'Prova un’altra classe oppure torna alla vista completa della bacheca.'
              : $.isProf
                ? 'Crea la prima card per condividere materiali, compiti o avvisi con la classe.'
                : 'Le card appariranno qui quando verranno pubblicate.'}
          </div>
        }
        {
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
            {filtroAttivo && (
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
                  if ($.apriNuovaCard) $.apriNuovaCard();
                  else {
                    $.setEditMode(null);
                    $.setForm(Object.assign({}, FORM0));
                    $.setShowModal(true);
                  }
                }}
                className="btn btn-primary"
              >
                + Aggiungi la prima card
              </button>
            )}
          </div>
        }
      </div>
    );
  }

  return (
    <div
      className="card-grid"
      style={GRID_STYLE}
      onDragOver={function (e: any) {
        // Drop anche nei VUOTI tra le card (layout a colonne): senza questo il
        // browser non accetta il drop e la card tornava al punto di partenza.
        if ($.onGridDragOver) $.onGridDragOver(e);
      }}
      onDrop={function (e: any) {
        if ($.onGridDrop) $.onGridDrop(e);
      }}
    >
      {$.visibleSorted.map(function (c: any, i: number) {
        // idx = posizione nella griglia: guida l'entrata a cascata delle card.
        return <CardItem key={c.id} $={$} c={c} idx={i} />;
      })}
    </div>
  );
}

export default CardGrid__;
