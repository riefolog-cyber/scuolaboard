// PrintModal.tsx  ·  ScuolaBoard  ·  Stampa / PDF della bacheca
// Mostra un'anteprima "foglio" delle card VISIBILI (la griglia applica già i
// filtri classe/anno) e stampa con window.print(). I pulsanti e il backdrop
// sono nascosti alla stampa dalla regola @media print (classe .print-area).
import { useEffect } from 'react';
import { etichettaClassi } from '../card-classi.ts';

function fmtData(d: any) {
  try {
    return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (e) {
    return '';
  }
}

function PrintModal(props: any) {
  // ATTENZIONE: nessun early-return prima degli hook (regola React: stesso
  // numero di hook a ogni render). Il return null arriva DOPO tutti gli hook.
  // Il foglio è un documento che finisce in classe: proposte non ancora
  // approvate e card nascoste restano fuori. `visibleSorted` è già filtrato per
  // anno/classe, ma NON per lo stato di pubblicazione: il prof con filtro 'tutte'
  // ci trova dentro anche le proposte e le card che ha nascosto (`visibileAlProf`
  // gliele mostra apposta, per poterle gestire) — prima finivano sul foglio.
  var tutte = props.visibleSorted || props.cards || [];
  var cards = tutte.filter(function (c: any) {
    return c && !c.proposta && c.visibile !== false;
  });
  var fuori = tutte.length - cards.length;
  var filtri: string[] = [];
  // `filterClasse` vale 'tutte', '_solo' o il nome della classe (minuscoli per i
  // due segnaposto, vedi cards.ts). Il confronto era con 'TUTTE' MAIUSCOLO, quindi
  // non scattava mai: il foglio annunciava «classe tutte» e, nella vista solo
  // prof, perfino «classe _solo» — un identificatore interno stampato su un
  // documento che finisce in mano agli studenti. Ora i due segnaposto hanno il
  // loro testo leggibile e il resto resta «classe <nome>».
  var fc = String(props.filterClasse || '');
  if (fc === '_solo') filtri.push('solo prof');
  else if (fc && fc !== 'tutte') filtri.push('classe ' + fc);
  if (props.isProf && !props.simulaSt && filtri.length === 0) filtri.push('tutte le classi');

  // Blocca lo scroll di sfondo mentre l'anteprima è aperta.
  useEffect(
    function () {
      if (!props.showStampa) return;
      var prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return function () {
        document.body.style.overflow = prev;
      };
    },
    [props.showStampa]
  );

  if (!props.showStampa) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Anteprima stampa"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.78)',
        zIndex: 400,
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={function () {
        props.setShowStampa(false);
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 18px',
          borderBottom: '1px solid rgba(255,255,255,.1)',
        }}
        onClick={function (e: any) {
          e.stopPropagation();
        }}
      >
        <span style={{ fontSize: 18 }}>🖨️</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: '#f1f5f9', letterSpacing: 0.3 }}>ANTEPRIMA STAMPA</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>
            {cards.length + ' card · ' + (props.annoScolastico || '') + (filtri.length ? ' · ' + filtri.join(', ') : '')}
          </div>
        </div>
        <button
          aria-label="Chiudi anteprima stampa"
          onClick={function () {
            props.setShowStampa(false);
          }}
          style={{
            background: 'rgba(255,255,255,.06)',
            border: '1px solid rgba(255,255,255,.12)',
            borderRadius: 8,
            padding: '5px 10px',
            cursor: 'pointer',
            fontSize: 13,
            color: 'rgba(255,255,255,.7)',
          }}
        >
          ✕
        </button>
      </div>

      {/* Scrollabile: la parte .print-area è l'unica visibile alla stampa */}
      <div style={{ flex: 1, overflow: 'auto', padding: '18px' }} onClick={function (e: any) {
        e.stopPropagation();
      }}>
        <div
          className="print-area"
          style={{
            background: '#fff',
            color: '#0f172a',
            maxWidth: 800,
            margin: '0 auto',
            borderRadius: 14,
            padding: '36px 40px',
            boxShadow: '0 12px 40px rgba(0,0,0,.4)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 1 }}>
              SCUOLABOARD — BACHECA
            </div>
            <div style={{ fontSize: 11, color: '#64748b', textAlign: 'right' }}>
              {'Anno ' + (props.annoScolastico || '')}
              <br />
              {new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#475569',
              marginBottom: 20,
              paddingBottom: 12,
              borderBottom: '2px solid #0f172a',
            }}
          >
            {filtri.length > 0 ? filtri.join(', ') : 'Tutte le card visibili'}
          </div>
          {fuori > 0 && (
            <div
              className="print-hide"
              style={{ fontSize: 11, color: '#64748b', marginTop: -10, marginBottom: 16 }}
            >
              {fuori + ' card fuori dal foglio (proposte non approvate o nascoste).'}
            </div>
          )}

          {cards.length === 0 && (
            <div style={{ fontSize: 13, color: '#475569', textAlign: 'center', padding: '30px 0' }}>
              Nessuna card da stampare.
            </div>
          )}

          {cards.map(function (c: any, i: number) {
            // Stessa etichetta della bacheca: il foglio non deve dire «TUTTE» né
            // nascondere che la card è stata tolta a una classe (card-classi.ts).
            var cc = etichettaClassi(c);
            return (
              <div
                key={c.id}
                className="print-card"
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  padding: '12px 16px',
                  marginBottom: 12,
                  breakInside: 'avoid',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', lineHeight: 1.35 }}>
                      {(i + 1) + '. ' + c.titolo}
                    </div>
                    <div style={{ fontSize: 11, marginTop: 3 }}>
                      <span style={{ fontWeight: 800, color: '#4f46e5' }}>
                        {(props.tipoIcon ? props.tipoIcon(c.tipo) : '') + ' ' + (c.tipo || '').toUpperCase()}
                      </span>
                      <span style={{ color: '#64748b' }}>{' · ' + cc}</span>
                    </div>
                    {c.testo && (
                      <div style={{ fontSize: 12, color: '#334155', marginTop: 6, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                        {c.testo}
                      </div>
                    )}
                    {c.quizDomande && c.quizDomande.length > 0 && (
                      <div style={{ fontSize: 11, color: '#be185d', marginTop: 6, fontWeight: 700 }}>
                        {'🧩 ' + c.quizDomande.length + ' domande'}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: '#64748b', flexWrap: 'wrap' }}>
                  {c.scadenza && <span>{'⏰ Scade il ' + fmtData(c.scadenza)}</span>}
                  <span>{'👍 ' + (c.likes || 0)}</span>
                  <span>{'💬 ' + ((c.commenti || []).length || 0)}</span>
                  {c.autore && <span>{'✍️ ' + c.autore}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 10,
          padding: '12px 18px',
          borderTop: '1px solid rgba(255,255,255,.1)',
        }}
        onClick={function (e: any) {
          e.stopPropagation();
        }}
      >
        <button
          onClick={function () {
            props.setShowStampa(false);
          }}
          className="print-hide"
          style={{
            padding: '10px 20px',
            background: 'rgba(255,255,255,.07)',
            border: '1px solid rgba(255,255,255,.15)',
            borderRadius: 11,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 700,
            color: 'rgba(255,255,255,.75)',
          }}
        >
          Annulla
        </button>
        <button
          onClick={function () {
            window.print();
          }}
          className="print-hide"
          style={{
            padding: '10px 22px',
            background: 'linear-gradient(135deg,var(--c-primary, #6366f1),#a855f7)',
            border: 'none',
            borderRadius: 11,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 800,
            color: '#fff',
            boxShadow: '0 4px 16px rgba(var(--c-primary-rgb),.35)',
          }}
        >
          🖨️ Stampa / Salva PDF
        </button>
      </div>
    </div>
  );
}

export default PrintModal;