// ProfiloModal.tsx  ·  estratto da Modals.tsx (split Fase 2a)
var SB = window.SB || {};
window.SB = SB;
var h = SB.h || React.createElement;
var Fragment = SB.Fragment || React.Fragment;

function ProfiloModal(props) {
  if (!props.showProfilo || props.isProf) return null;
  var user = props.user;
  var cards = props.cards || [];
  var preferiti = props.preferiti || [];
  var setShowProfilo = props.setShowProfilo;
  var myName = props.myName;
  function c(n) {
    return n || 0;
  }
  var vn = myName(user);
  var mieCard = cards.filter(function (c) {
    return !c.proposta && c.visibile !== false;
  });
  var meiCommenti = 0;
  mieCard.forEach(function (c) {
    (c.commenti || []).forEach(function (cm) {
      if (cm.autore === vn) meiCommenti++;
      (cm.risposte || []).forEach(function (r) {
        if (r.autore === vn) meiCommenti++;
      });
    });
  });
  var meiLike = mieCard.filter(function (c) {
    return (c.likesBy || []).indexOf(vn) >= 0;
  }).length;
  var meiVoti = mieCard.filter(function (c) {
    return (
      c.opzioni &&
      c.opzioni.some(function (o) {
        return o.voti.indexOf(vn) >= 0;
      })
    );
  }).length;
  var meiPref = preferiti.length;
  var totCard = mieCard.length;
  var pctComm = totCard > 0 ? Math.round((meiCommenti / totCard) * 10) / 10 : 0;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.8)',
        zIndex: 400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={function () {
        setShowProfilo(false);
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
            padding: 28,
            maxWidth: 380,
            width: '100%',
          }}
          onClick={function (e) {
            e.stopPropagation();
          }}
        >
          {
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt=""
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    border: '3px solid rgba(99,102,241,.5)',
                    marginBottom: 10,
                    display: 'block',
                    margin: '0 auto 10px',
                  }}
                />
              )}
              {<div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 17 }}>{user.nome + ' ' + user.cognome}</div>}
              {(props.classeCorrente || user.classe) && (
                <span
                  style={{
                    background: 'rgba(251,146,60,.2)',
                    color: '#fb923c',
                    borderRadius: 20,
                    padding: '2px 10px',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {props.classeCorrente || user.classe}
                </span>
              )}
            </div>
          }
          {
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { v: c(meiCommenti), l: 'Commenti scritti', i: '💬', c: '#a5b4fc' },
                { v: c(meiLike), l: 'Like dati', i: '👍', c: '#6366f1' },
                { v: c(meiVoti), l: 'Sondaggi votati', i: '🗳️', c: '#22c55e' },
                { v: c(meiPref), l: 'Preferiti', i: '★', c: '#fbbf24' },
              ].map(function (s) {
                return (
                  <div
                    key={s.l}
                    style={{
                      background: 'rgba(255,255,255,.04)',
                      border: '1px solid rgba(255,255,255,.08)',
                      borderRadius: 12,
                      padding: '12px 14px',
                      textAlign: 'center',
                    }}
                  >
                    {<div style={{ fontSize: 26, fontWeight: 800, color: s.c }}>{s.v}</div>}
                    {
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.58)', marginTop: 2 }}>
                        {s.i + ' ' + s.l}
                      </div>
                    }
                  </div>
                );
              })}
            </div>
          }
          {meiCommenti > 0 && (
            <div
              style={{
                background: 'rgba(99,102,241,.1)',
                border: '1px solid rgba(99,102,241,.2)',
                borderRadius: 10,
                padding: '10px 14px',
                marginBottom: 14,
                textAlign: 'center',
                fontSize: 12,
                color: 'rgba(255,255,255,.6)',
              }}
            >
              Media di {<span style={{ color: '#a5b4fc', fontWeight: 800 }}>{pctComm}</span>} commenti per card
            </div>
          )}
          {
            <button
              onClick={function () {
                setShowProfilo(false);
              }}
              style={{
                width: '100%',
                padding: 11,
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: '#fff',
                border: 'none',
                borderRadius: 11,
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Chiudi
            </button>
          }
        </div>
      }
    </div>
  );
}

SB.ProfiloModal = ProfiloModal;
export default ProfiloModal;
