// CardDetail.jsx · ScuolaBoard
var SB = window.SB || {};
var h = SB.h || React.createElement;

import QuizPanel from './carddetail/QuizPanel.tsx';
import AIPanel from './carddetail/AIPanel.tsx';
import PartecipazionePanel from './carddetail/PartecipazionePanel.tsx';
import DomandeLiberePanel from './carddetail/DomandeLiberePanel.tsx';
import CommentsSection from './carddetail/CommentsSection.tsx';
import RifiutaModal from './carddetail/RifiutaModal.tsx';

function CardDetail__({ $ }: any) {
  if (!$.showCard) return null;
  var c = $.showCard;
  var totV = c.opzioni
    ? c.opzioni.reduce(function (a: any, o: any) {
        return a + (o.voti || []).length;
      }, 0)
    : 0;
  var liked = $.myLikes.current.has(String(c.id));
  var isOwner = !$.isProf && $.user && c.autore === $.myName($.user) && !c.proposta;
  var cardLinks = window.normalizeLinks ? window.normalizeLinks(c) : [];
  var nascosta = c.visibile === false;
  var cc = c.classi || ['TUTTE'];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.7)',
        backdropFilter: 'blur(6px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0',
      }}
      onClick={$.closeCard}
    >
      <div
        className="modal-inner"
        style={{
          background: 'rgba(15,23,42,.96)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,.11)',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -8px 60px rgba(0,0,0,.6)',
          width: '100%',
          maxWidth: 560,
          maxHeight: '92vh',
          overflow: 'auto',
        }}
        onClick={function (e: any) {
          e.stopPropagation();
        }}
      >
        {/* Header sticky: handle trascinamento + X per chiudere */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 6,
            display: 'flex',
            justifyContent: 'center',
            padding: '10px 12px 6px',
            background:
              'linear-gradient(180deg, rgba(15,23,42,.97) 0%, rgba(15,23,42,.97) 55%, rgba(15,23,42,0) 100%)',
          }}
        >
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.25)', marginTop: 6 }} />
          <button
            onClick={function (e: any) {
              e.stopPropagation();
              $.closeCard();
            }}
            aria-label="Chiudi card"
            title="Chiudi"
            className="cd-close"
            style={{
              position: 'absolute',
              right: 10,
              top: 8,
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,.14)',
              background: 'rgba(255,255,255,.08)',
              color: 'rgba(255,255,255,.85)',
              fontSize: 16,
              fontWeight: 700,
              lineHeight: 1,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Cover image */}
        {c.copertina && (
          <div
            style={{ width: '100%', background: '#0f172a', cursor: 'pointer' }}
            onClick={function (e: any) {
              e.stopPropagation();
              $.setLightbox({ url: c.copertina, didascalia: c.titolo });
            }}
          >
            <img
              src={c.copertina}
              alt=""
              style={{ width: '100%', maxHeight: 240, objectFit: 'contain', display: 'block' }}
            />
          </div>
        )}

        {/* Body */}
        <div style={{ padding: '16px 18px 10px' }}>
          {/* Type badge + classi */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
            <span
              style={{
                background: $.badgeBg(c.tipo),
                color: '#fff',
                borderRadius: 7,
                padding: '3px 9px',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 0.5,
                boxShadow: '0 2px 8px ' + $.badgeBg(c.tipo) + '55',
              }}
            >
              {$.tipoIcon(c.tipo) + ' ' + (c.tipo || '').toUpperCase()}
            </span>
            {$.isProf && cc.indexOf('TUTTE') < 0 && cc.length > 0 && (
              <span
                className="badge-chip"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  background: 'rgba(255,255,255,.07)',
                  color: 'rgba(255,255,255,.7)',
                }}
              >
                {cc.slice(0, 3).map(function (cl: any, i: any) {
                  var isCustom = $.CLASSI_DEFAULT.indexOf(cl) < 0;
                  var ccc = isCustom ? $.classeColor(cl, $.classiCustom) : '#fb923c';
                  return (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <span
                        style={{ width: 6, height: 6, borderRadius: '50%', background: ccc, display: 'inline-block' }}
                      />
                      {cl}
                      {i < Math.min(cc.length, 3) - 1 ? ', ' : ''}
                    </span>
                  );
                })}
                {cc.length > 3 && '…'}
              </span>
            )}
            {nascosta && $.isProf && (
              <span
                className="badge-chip"
                style={{
                  background: 'rgba(239,68,68,.2)',
                  color: '#f87171',
                  padding: '2px 6px',
                }}
              >
                NASCOSTA
              </span>
            )}
          </div>

          {/* Title */}
          <h2
            style={{
              margin: '0 0 8px',
              fontWeight: 800,
              fontSize: 17,
              color: '#f1f5f9',
              lineHeight: 1.35,
              letterSpacing: 0.1,
            }}
          >
            {c.titolo}
          </h2>

          {/* Autor */}
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginBottom: 10 }}>
            di <strong style={{ color: 'rgba(255,255,255,.7)' }}>{c.autore || 'Prof'}</strong> · {$.timeAgo(c.data)}
          </div>

          {/* Testo */}
          {c.testo && (
            <div
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,.78)',
                lineHeight: 1.7,
                marginBottom: 14,
                whiteSpace: 'pre-wrap',
              }}
            >
              {c.testo}
            </div>
          )}

          {/* Images gallery */}
          {c.immagini && c.immagini.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {c.immagini.map(function (img: any, i: any) {
                // Le immagini galleria sono oggetti { id, url, didascalia } (con
                // retro-compatibilità per vecchie card con url stringa).
                var url = img && img.url ? img.url : img;
                var dida = img && img.didascalia ? img.didascalia : '';
                var tutti = (c.immagini || []).map(function (x: any) {
                  return {
                    url: x && x.url ? x.url : x,
                    didascalia: (x && x.didascalia) || '',
                  };
                });
                return (
                  <div key={i} style={{ width: 80, flexShrink: 0 }}>
                    <img
                      src={url}
                      alt={dida}
                      style={{
                        width: 80,
                        height: 80,
                        objectFit: 'cover',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,.1)',
                        cursor: 'pointer',
                        display: 'block',
                      }}
                      onClick={function () {
                        $.setLightbox({ url: url, didascalia: dida, tutti: tutti, idx: i });
                      }}
                    />
                    {dida && (
                      <div
                        style={{
                          fontSize: 10,
                          color: 'rgba(255,255,255,.5)',
                          marginTop: 3,
                          textAlign: 'center',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {dida}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* File attachments */}
          {c.allegati && c.allegati.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,.5)',
                  marginBottom: 6,
                  letterSpacing: 1,
                }}
              >
                📎 ALLEGATI
              </div>
              {c.allegati.map(function (al: any, i: any) {
                return (
                  <a
                    key={i}
                    href={al.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 10px',
                      background: 'rgba(255,255,255,.04)',
                      borderRadius: 8,
                      marginBottom: 4,
                      color: '#60a5fa',
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: 'none',
                      border: '1px solid rgba(255,255,255,.06)',
                    }}
                  >
                    📄 {al.nome || 'File ' + (i + 1)}
                  </a>
                );
              })}
            </div>
          )}

          {/* Links */}
          {cardLinks.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              {cardLinks.map(function (link: any, i: any) {
                return (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'block',
                      color: '#60a5fa',
                      fontSize: 12,
                      marginBottom: 3,
                      wordBreak: 'break-all',
                    }}
                  >
                    {'🔗 ' + (link.label || link.url)}
                  </a>
                );
              })}
            </div>
          )}

          {/* Scadenza */}
          {c.scadenza &&
            (function () {
              var ms = new Date(c.scadenza).getTime() - Date.now();
              var expired = ms <= 0;
              var secs = Math.floor(ms / 1000),
                mins = Math.floor(secs / 60),
                hrs = Math.floor(mins / 60),
                days = Math.floor(hrs / 24);
              var str = expired
                ? 'Scaduta'
                : days > 0
                  ? days + 'g ' + (hrs % 24) + 'h'
                  : hrs > 0
                    ? (hrs % 24) + 'h ' + (mins % 60) + 'm'
                    : mins > 0
                      ? (mins % 60) + 'm ' + (secs % 60) + 's'
                      : (secs % 60) + 's';
              return (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    background: expired ? 'rgba(239,68,68,.15)' : 'rgba(245,158,11,.12)',
                    border: '1px solid ' + (expired ? 'rgba(239,68,68,.3)' : 'rgba(245,158,11,.25)'),
                    borderRadius: 20,
                    padding: '3px 10px',
                    fontSize: 11,
                    color: expired ? '#f87171' : '#fbbf24',
                    fontWeight: 700,
                    marginBottom: 12,
                  }}
                >
                  <span>{'⏰ ' + str}</span>
                  {$.isProf && !$.simulaSt && (
                    <button
                      onClick={function (e: any) {
                        e.stopPropagation();
                        $.setCardTimer(c.id, null);
                      }}
                      title="Rimuovi scadenza"
                      aria-label="Rimuovi scadenza"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255,255,255,.45)',
                        fontSize: 14,
                        cursor: 'pointer',
                        padding: '0 2px',
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })()}

          {/* Sondaggio */}
          {c.tipo === 'sondaggio' && c.opzioni && (
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'rgba(255,255,255,.5)',
                  letterSpacing: 1,
                  marginBottom: 8,
                }}
              >
                🗳️ SONDAGGIO · {totV} voti
              </div>
              {c.opzioni.map(function (o: any) {
                var pct = totV > 0 ? Math.round(((o.voti || []).length / totV) * 100) : 0;
                var hasVoted = (o.voti || []).indexOf($.myName($.user)) >= 0;
                return (
                  <div key={o.id} style={{ marginBottom: 8 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12,
                        color: 'rgba(255,255,255,.65)',
                        marginBottom: 4,
                      }}
                    >
                      <span>{o.testo}</span>
                      <span style={{ fontWeight: 700 }}>{pct + '%'}</span>
                    </div>
                    <div
                      style={{ height: 8, background: 'rgba(255,255,255,.08)', borderRadius: 4, overflow: 'hidden' }}
                    >
                      <div
                        style={{
                          height: 8,
                          background: hasVoted ? 'linear-gradient(90deg,#6366f1,#a855f7)' : '#6366f1',
                          borderRadius: 4,
                          width: pct + '%',
                          transition: 'width .3s',
                        }}
                      />
                    </div>
                    {!$.isProf && !hasVoted && (
                      <button
                        onClick={function () {
                          $.vote(c.id, o.id);
                        }}
                        style={{
                          marginTop: 4,
                          background: 'rgba(99,102,241,.2)',
                          border: '1px solid rgba(99,102,241,.4)',
                          borderRadius: 8,
                          padding: '3px 10px',
                          cursor: 'pointer',
                          fontSize: 11,
                          color: '#a5b4fc',
                          fontWeight: 700,
                        }}
                      >
                        Vota {o.testo}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Quiz */}
          <QuizPanel $={$} c={c} />

          {/* AI Analysis Panel */}
          <AIPanel $={$} c={c} />

          {/* Like + Reactions row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <button
              onClick={function (e: any) {
                e.stopPropagation();
                $.toggleLike(c.id);
              }}
              className="cd-pill"
              style={{
                background: liked ? 'rgba(99,102,241,.3)' : 'rgba(255,255,255,.08)',
                border: '1px solid ' + (liked ? 'rgba(99,102,241,.5)' : 'rgba(255,255,255,.1)'),
                padding: '4px 10px',
                fontSize: 12,
                color: liked ? '#a5b4fc' : 'rgba(255,255,255,.65)',
                gap: 4,
              }}
            >
              👍 <span style={{ fontSize: 11, fontWeight: 700 }}>{c.likes || 0}</span>
            </button>
            {$.isProf && !$.simulaSt && (
              <button
                onClick={function (e: any) {
                  e.stopPropagation();
                  $.setShowTimerModal(true);
                  $.setTimerInput(c.scadenza ? String(c.scadenza).slice(0, 16) : '');
                }}
                className="cd-pill"
                style={{
                  background: 'rgba(245,158,11,.15)',
                  border: '1px solid rgba(245,158,11,.3)',
                  color: '#fbbf24',
                }}
              >
                ⏰ Timer
              </button>
            )}
            {['🤔', '💡', '🔥'].map(function (emoji) {
              var lista = (c.reazioni && c.reazioni[emoji]) || [];
              var hasMe = lista.indexOf($.myName($.user)) >= 0;
              return (
                <button
                  key={emoji}
                  onClick={function (e: any) {
                    e.stopPropagation();
                    $.toggleReazione(c.id, emoji);
                  }}
                  title={lista.length > 0 ? lista.join(', ') : emoji}
                  aria-label={'Reagisci ' + emoji}
                  className="cd-pill"
                  style={{
                    background: hasMe ? 'rgba(99,102,241,.25)' : 'rgba(255,255,255,.06)',
                    border: '1px solid ' + (hasMe ? 'rgba(99,102,241,.4)' : 'rgba(255,255,255,.1)'),
                    padding: '4px 8px',
                    fontSize: 12,
                    color: hasMe ? '#a5b4fc' : 'rgba(255,255,255,.65)',
                    gap: 3,
                  }}
                >
                  {emoji}
                  {lista.length > 0 && <span style={{ fontSize: 11, fontWeight: 700 }}>{lista.length}</span>}
                </button>
              );
            })}
            <span style={{ flex: 1 }} />
            {$.isProf && !$.simulaSt && (
              <button
                onClick={function (e: any) {
                  e.stopPropagation();
                  $.editCard(c);
                }}
                className="cd-pill"
                style={{
                  background: 'rgba(59,130,246,.2)',
                  border: '1px solid rgba(59,130,246,.4)',
                  color: '#60a5fa',
                }}
              >
                ✏️ Modifica
              </button>
            )}
            {isOwner && (
              <button
                onClick={function (e: any) {
                  e.stopPropagation();
                  $.editCard(c);
                }}
                className="cd-pill"
                style={{
                  background: 'rgba(59,130,246,.2)',
                  border: '1px solid rgba(59,130,246,.4)',
                  color: '#60a5fa',
                }}
              >
                ✏️ Modifica
              </button>
            )}
            {$.isProf && !$.simulaSt && (
              <button
                onClick={function (e: any) {
                  e.stopPropagation();
                  $.delCardWithUndo(c.id);
                }}
                className="cd-pill"
                style={{
                  background: 'rgba(239,68,68,.15)',
                  border: '1px solid rgba(239,68,68,.3)',
                  color: '#f87171',
                }}
              >
                🗑️ Elimina
              </button>
            )}
          </div>

          {/* Partecipazione + ammonizioni (prof) */}
          <PartecipazionePanel $={$} c={c} />

          {/* Sondaggio AI analisi (prof) */}
          {$.isProf && !$.simulaSt && c.tipo === 'sondaggio' && (
            <button
              onClick={function (e: any) {
                e.stopPropagation();
                $.aiAnalisiSondaggio(c);
              }}
              className="cd-pill"
              style={{
                background: 'rgba(99,102,241,.12)',
                border: '1px solid rgba(99,102,241,.3)',
                color: '#a5b4fc',
                marginBottom: 8,
              }}
            >
              🤖 Analizza sondaggio
            </button>
          )}
          {c.tipo === 'sondaggio' && $.sondaggioAiResult[c.id] && (
            <div
              style={{
                background: 'rgba(99,102,241,.08)',
                border: '1px solid rgba(99,102,241,.2)',
                borderRadius: 8,
                padding: '8px 12px',
                marginBottom: 12,
                fontSize: 12,
                color: 'rgba(255,255,255,.75)',
                lineHeight: 1.6,
              }}
            >
              {$.sondaggioAiResult[c.id]}
            </div>
          )}

          {/* Sezione domande libere AI — SOLO PROF (le chiamate AI costano e sono riservate al docente) */}
          <DomandeLiberePanel $={$} c={c} />
        </div>

        {/* Comments section */}
        <CommentsSection $={$} c={c} />

        {/* Rifiuta proposta modal */}
        <RifiutaModal $={$} c={c} />
      </div>
    </div>
  );
}
SB.CardDetail = CardDetail__;
export default CardDetail__;
