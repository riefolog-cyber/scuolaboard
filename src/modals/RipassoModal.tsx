import { useEffect, useMemo, useState } from 'react';
// RipassoModal.tsx  ·  ScuolaBoard  ·  Modalità ripasso (flashcard)
// Raccoglie le domande dei quiz visibili (griglia già filtrata per classe/anno)
// e le mostra una alla volta: fronte = domanda, retro = risposta esatta.

// Risposta "esatta" per una domanda: per la multipla `corretta` è l'INDICE
// dell'opzione, per vero/falso è il TESTO ('Vero'/'Falso'); per le aperte non
// c'è risposta univoca → escluse dal mazzo (si risolvono in card detail).
function rispostaEsatta(d: any): string | null {
  if (d == null) return null;
  var c = d.corretta;
  if (c == null || c === '') return null;
  if (d.opzioni && Array.isArray(d.opzioni)) {
    // indice (multipla) o testo (vero/falso)
    var idx = Number(c);
    if (!isNaN(idx) && d.opzioni[idx] != null) return String(d.opzioni[idx]);
    return String(c);
  }
  return String(c);
}

function buildDeck(cards: any[]) {
  var deck: any[] = [];
  (cards || []).forEach(function (c: any) {
    (c.quizDomande || []).forEach(function (d: any, i: number) {
      var risposta = rispostaEsatta(d);
      if (risposta == null) return; // aperte senza corretta: niente flashcard
      deck.push({
        cardId: c.id,
        cardTitolo: c.titolo,
        tipo: d.tipo || 'multipla',
        domanda: d.testo,
        risposta: risposta,
        idxDomanda: i,
      });
    });
  });
  return deck;
}

function shuffleDeck(deck: any[]) {
  var a = deck.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

function RipassoModal(props: any) {
  // ATTENZIONE: nessun early-return prima degli hook (regola React: stesso
  // numero di hook a ogni render). Il return null arriva DOPO tutti gli hook.
  var isLight = !!props.isLight;

  // Il mazzo si costruisce dalle card visibili all'utente (la griglia è già
  // filtrata per classe/anno/visibilità): niente read extra a Firestore.
  var deckBase = useMemo(
    function () {
      return buildDeck(props.visibleSorted || props.cards || []);
    },
    [props.visibleSorted, props.cards]
  );
  // Firma del contenuto (non identità): evita di resettare la posizione
  // quando la griglia si ri-renderizza (es. like, toasts) senza nuove domande.
  var deckSig = deckBase
    .map(function (f: any) {
      return String(f.cardId) + '#' + String(f.idxDomanda);
    })
    .join('|');

  var [shuffled, setShuffled] = useState(false);
  var [deck, setDeck] = useState<any[]>([]);
  var [idx, setIdx] = useState(0);
  var [girata, setGirata] = useState(false);
  var [viste, setViste] = useState(0);

  // Rebuild del mazzo alla riapertura, al cambio contenuto o al toggle shuffle.
  useEffect(
    function () {
      if (!props.showRipasso) return;
      var base = shuffled ? shuffleDeck(deckBase) : deckBase.slice();
      setDeck(base);
      setIdx(0);
      setGirata(false);
      setViste(0);
    },
    [props.showRipasso, deckSig, shuffled]
  );

  if (!props.showRipasso) return null;

  function chiudi() {
    props.setShowRipasso(false);
  }

  function avanti() {
    setGirata(false);
    setIdx(function (i: number) {
      return Math.min(i + 1, deck.length - 1);
    });
  }

  function indietro() {
    setGirata(false);
    setIdx(function (i: number) {
      return Math.max(i - 1, 0);
    });
  }

  function segnaVista() {
    // Conteggia le card "studiate" (arrivare all'ultima = ripasso completo).
    setViste(function (v: number) {
      return Math.max(v, idx + 1);
    });
  }

  var current = deck[idx] || null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.78)',
        zIndex: 400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={chiudi}
    >
      <div
        role="dialog"
        aria-label="Modalità ripasso"
        onClick={function (e: any) {
          e.stopPropagation();
        }}
        style={{
          background: isLight ? '#ffffff' : 'rgba(15,23,42,.95)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid ' + (isLight ? 'rgba(15,23,42,.12)' : 'rgba(255,255,255,.11)'),
          borderRadius: 22,
          boxShadow: '0 24px 60px rgba(0,0,0,.5)',
          padding: 24,
          width: '100%',
          maxWidth: 560,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 22 }}>🎴</span>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 900,
                color: isLight ? '#0f172a' : '#f1f5f9',
                letterSpacing: 0.3,
              }}
            >
              MODALITÀ RIPASSO
            </div>
            <div style={{ fontSize: 11, color: isLight ? '#64748b' : 'rgba(255,255,255,.45)' }}>
              {deck.length + (deck.length !== 1 ? ' flashcard' : ' flashcard') + ' · tocca per girare'}
            </div>
          </div>
          <button
            aria-label="Chiudi ripasso"
            onClick={chiudi}
            style={{
              background: 'rgba(255,255,255,.06)',
              border: '1px solid rgba(255,255,255,.12)',
              borderRadius: 8,
              padding: '5px 10px',
              cursor: 'pointer',
              fontSize: 13,
              color: isLight ? '#334155' : 'rgba(255,255,255,.7)',
            }}
          >
            ✕
          </button>
        </div>

        {deck.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 46, marginBottom: 10 }}>🃏</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: isLight ? '#0f172a' : '#f1f5f9', marginBottom: 6 }}>
              Nessuna flashcard disponibile
            </div>
            <div style={{ fontSize: 12, color: isLight ? '#64748b' : 'rgba(255,255,255,.5)', lineHeight: 1.5 }}>
              Le flashcard si creano dai quiz con risposta esatta visibili nella tua bacheca.
            </div>
          </div>
        )}

        {current && (
          <div
            onClick={function () {
              segnaVista();
              setGirata(function (g: boolean) {
                return !g;
              });
            }}
            style={{
              flex: 1,
              minHeight: 220,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: girata
                ? isLight
                  ? 'rgba(34,197,94,.08)'
                  : 'rgba(34,197,94,.12)'
                : isLight
                  ? 'rgba(15,23,42,.04)'
                  : 'rgba(255,255,255,.05)',
              border:
                '1px solid ' +
                (girata
                  ? isLight
                    ? 'rgba(34,197,94,.4)'
                    : 'rgba(34,197,94,.45)'
                  : isLight
                    ? 'rgba(15,23,42,.1)'
                    : 'rgba(255,255,255,.1)'),
              borderRadius: 16,
              padding: '22px 26px',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'background .15s',
              userSelect: 'none',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.2, marginBottom: 10 }}>
              {girata ? (
                <span style={{ color: '#4ade80' }}>RISPOSTA</span>
              ) : (
                <span style={{ color: isLight ? '#64748b' : 'rgba(255,255,255,.38)' }}>
                  {String(idx + 1) + ' / ' + String(deck.length)}
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                lineHeight: 1.5,
                color: girata ? '#4ade80' : isLight ? '#0f172a' : '#f1f5f9',
                marginBottom: 8,
              }}
            >
              {girata ? current.risposta : current.domanda}
            </div>
            {!girata && (
              <div style={{ fontSize: 11, color: isLight ? '#94a3b8' : 'rgba(255,255,255,.38)' }}>
                {current.cardTitolo}
                {current.tipo === 'aperta' ? '' : current.tipo === 'vf' || current.tipo === 'vero_falso' ? ' · V/F' : ' · scelta multipla'}
              </div>
            )}
          </div>
        )}

        {current && (
          <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'center' }}>
            <button
              aria-label="Flashcard precedente"
              onClick={indietro}
              disabled={idx === 0}
              style={{
                padding: '10px 16px',
                background: 'rgba(255,255,255,.07)',
                border: '1px solid rgba(255,255,255,.12)',
                borderRadius: 11,
                cursor: idx === 0 ? 'not-allowed' : 'pointer',
                opacity: idx === 0 ? 0.4 : 1,
                fontSize: 13,
                fontWeight: 700,
                color: isLight ? '#334155' : 'rgba(255,255,255,.75)',
              }}
            >
              ← Indietro
            </button>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 11, color: isLight ? '#94a3b8' : 'rgba(255,255,255,.4)' }}>
              {viste >= deck.length && deck.length > 0 ? '🎉 Ripasso completato!' : ''}
            </div>
            <button
              aria-label="Flashcard successiva"
              onClick={function () {
                segnaVista();
                avanti();
              }}
              disabled={idx >= deck.length - 1}
              style={{
                padding: '10px 16px',
                background:
                  idx >= deck.length - 1 ? 'rgba(255,255,255,.06)' : 'linear-gradient(135deg,#6366f1,#a855f7)',
                border: 'none',
                borderRadius: 11,
                cursor: idx >= deck.length - 1 ? 'not-allowed' : 'pointer',
                opacity: idx >= deck.length - 1 ? 0.5 : 1,
                fontSize: 13,
                fontWeight: 800,
                color: idx >= deck.length - 1 ? (isLight ? '#64748b' : 'rgba(255,255,255,.4)') : '#fff',
              }}
            >
              Successiva →
            </button>
          </div>
        )}

        {deck.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginTop: 12,
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={function () {
                setShuffled(function (s: boolean) {
                  return !s;
                });
              }}
              style={{
                padding: '7px 14px',
                background: shuffled ? 'rgba(168,85,247,.25)' : 'rgba(255,255,255,.05)',
                border: '1px solid ' + (shuffled ? 'rgba(168,85,247,.5)' : 'rgba(255,255,255,.1)'),
                borderRadius: 10,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                color: shuffled ? '#d8b4fe' : isLight ? '#475569' : 'rgba(255,255,255,.6)',
              }}
            >
              🔀 {shuffled ? 'Ordine originale' : 'Mescola'}
            </button>
            <button
              onClick={function () {
                setIdx(0);
                setGirata(false);
              }}
              style={{
                padding: '7px 14px',
                background: 'rgba(255,255,255,.05)',
                border: '1px solid rgba(255,255,255,.1)',
                borderRadius: 10,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                color: isLight ? '#475569' : 'rgba(255,255,255,.6)',
              }}
            >
              ↺ Ricomincia
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default RipassoModal;