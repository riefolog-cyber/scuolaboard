// CardItem.jsx · ScuolaBoard
var SB = window.SB || {};
var h = SB.h || React.createElement;
var normalizeLinks = window.normalizeLinks;

function CardItem__({ $, c }: any) {
  var totV = c.opzioni
    ? c.opzioni.reduce(function (a: any, o: any) {
        return a + (o.voti || []).length;
      }, 0)
    : 0;
  var liked = $.myLikes.current.has(String(c.id));
  var aiD = ($.aiMap && $.aiMap[String(c.id)]) || {};
  var cRes = c.aiAnalisi || (aiD && aiD.analisi);
  var isOwner = !$.isProf && $.user && c.autore === $.myName($.user) && !c.proposta;
  var cardLinks = normalizeLinks(c);
  var nascosta = c.visibile === false;
  var nuova = !$.seenRef.current.has(String(c.id));
  var cc = c.classi || ['TUTTE'];

  return (
    <div
      id={'card-' + c.id}
      key={c.id}
      className={
        'card-wrap fadein' +
        ($.bulkMode && $.isProf ? ' bulk-card' : '') +
        ($.bulkMode && $.isProf && $.bulkSelected.indexOf(String(c.id)) >= 0 ? ' bulk-selected' : '')
      }
      draggable={!$.bulkMode && $.isProf && !$.simulaSt}
      onDragStart={function (e: any) {
        $.onDragStart(e, c.id);
      }}
      onDragEnd={function (e: any) {
        $.onDragEnd(e, c.id);
      }}
      onDragOver={function (e: any) {
        $.onDragOver(e, c.id);
      }}
      onDragLeave={function (e: any) {
        $.onDragLeave(e, c.id);
      }}
      onDrop={function (e: any) {
        $.onDrop(e, c.id);
      }}
      style={(function () {
        var tipoBorder = nascosta ? 'rgba(255,255,255,.08)' : $.badgeBg(c.tipo);
        return {
          breakInside: 'avoid',
          marginBottom: 16,
          background: nascosta ? 'rgba(255,255,255,.02)' : 'rgba(255,255,255,.055)',
          backdropFilter: 'blur(12px)',
          border: '1px solid ' + (nascosta ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.09)'),
          borderRadius: 18,
          overflow: 'hidden',
          opacity: nascosta ? 0.45 : 1,
          transition: 'transform .2s cubic-bezier(.22,1,.36,1),box-shadow .2s,opacity .2s',
          borderTop: '3px solid ' + tipoBorder,
        };
      })()}
    >
      {
        <div
          style={{ cursor: 'pointer', position: 'relative' }}
          onClick={function () {
            $.openCard(c);
          }}
        >
          {
            <div
              style={{
                position: 'absolute',
                bottom: 6,
                right: 8,
                fontSize: 32,
                opacity: 0.06,
                pointerEvents: 'none',
                userSelect: 'none',
                lineHeight: 1,
              }}
            >
              {$.tipoIcon(c.tipo)}
            </div>
          }
          {c.copertina && (
            <div
              style={{
                width: '100%',
                background: '#0f172a',
                borderRadius: '16px 16px 0 0',
                overflow: 'hidden',
                position: 'relative',
                cursor: 'pointer',
              }}
              onClick={function (e: any) {
                e.stopPropagation();
                $.setLightbox({ url: c.copertina, didascalia: c.titolo });
              }}
            >
              {
                <img
                  src={c.copertina}
                  alt=""
                  style={{ width: '100%', maxHeight: 200, objectFit: 'contain', display: 'block' }}
                />
              }
              {c.immagini && c.immagini.length > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 5,
                    right: 7,
                    background: 'rgba(0,0,0,.6)',
                    color: '#fff',
                    borderRadius: 20,
                    padding: '1px 7px',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {'🖼️ +' + c.immagini.length}
                </span>
              )}
            </div>
          )}
          {
            <div style={{ padding: '12px 14px 6px' }}>
              {
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 6,
                    gap: 4,
                  }}
                >
                  {
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                      {
                        <span
                          className="badge-chip"
                          style={{
                            background: $.badgeBg(c.tipo),
                            color: '#fff',
                            padding: '3px 9px',
                            fontWeight: 800,
                            letterSpacing: 0.5,
                            boxShadow: '0 2px 8px ' + $.badgeBg(c.tipo) + '55',
                          }}
                        >
                          {$.tipoIcon(c.tipo) + ' ' + (c.tipo || '').toUpperCase()}
                        </span>
                      }
                      {$.isProf && cc.indexOf('TUTTE') < 0 && cc.length > 0 && (
                        <span
                          className="badge-chip"
                          style={{
                            background: 'rgba(255,255,255,.07)',
                            color: 'rgba(255,255,255,.7)',
                          }}
                        >
                          {cc.slice(0, 3).map(function (cl: any, i: any) {
                            var isCustom = $.CLASSI_DEFAULT.indexOf(cl) < 0;
                            var ccc = isCustom ? $.classeColor(cl, $.classiCustom) : '#fb923c';
                            return (
                              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                {
                                  <span
                                    style={{
                                      width: 6,
                                      height: 6,
                                      borderRadius: '50%',
                                      background: ccc,
                                      display: 'inline-block',
                                    }}
                                  />
                                }
                                {cl}
                                {i < Math.min(cc.length, 3) - 1 ? ', ' : ''}
                              </span>
                            );
                          })}
                          {cc.length > 3 && '…'}
                        </span>
                      )}
                      {$.isProf && cc.length === 0 && (
                        <span
                          className="badge-chip"
                          style={{
                            background: 'rgba(239,68,68,.2)',
                            color: '#f87171',
                          }}
                        >
                          Solo prof
                        </span>
                      )}
                      {nuova && (
                        <span
                          className="badge-chip"
                          style={{
                            background: 'rgba(34,197,94,.25)',
                            color: '#4ade80',
                            padding: '2px 6px',
                            fontWeight: 800,
                            border: '1px solid rgba(34,197,94,.4)',
                          }}
                        >
                          NUOVO
                        </span>
                      )}
                      {nascosta && $.isProf && (
                        <span
                          className="badge-chip"
                          style={{
                            background: 'rgba(239,68,68,.2)',
                            color: '#f87171',
                            padding: '2px 6px',
                            fontWeight: 800,
                          }}
                        >
                          NASCOSTA
                        </span>
                      )}
                    </div>
                  }
                  {$.isProf && !$.simulaSt && (
                    <button
                      type="button"
                      aria-label={nascosta ? 'Rendi visibile' : 'Nascondi'}
                      title={nascosta ? 'Rendi visibile' : 'Nascondi'}
                      className="icon-btn"
                      onClick={function (e: any) {
                        e.stopPropagation();
                        $.toggleVisibile(c, e);
                      }}
                    >
                      {nascosta ? '🚫' : '👁️'}
                    </button>
                  )}
                </div>
              }
              {$.isProf && !$.simulaSt && (
                <div
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,.45)',
                    marginBottom: 4,
                    cursor: 'grab',
                    userSelect: 'none',
                  }}
                >
                  ☰ trascina per riordinare
                </div>
              )}
              {
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 14,
                    color: nascosta ? 'rgba(255,255,255,.58)' : '#f1f5f9',
                    lineHeight: 1.35,
                    marginBottom: 5,
                    letterSpacing: 0.1,
                  }}
                >
                  {c.titolo}
                </div>
              }
              {c.testo && (
                <div
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,.58)',
                    lineHeight: 1.5,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {c.testo}
                </div>
              )}
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
                        padding: '2px 8px',
                        fontSize: 11,
                        color: expired ? '#f87171' : '#fbbf24',
                        fontWeight: 700,
                        marginTop: 4,
                      }}
                    >
                      {'⏰ ' + str}
                    </div>
                  );
                })()}
              {cardLinks.length > 0 && (
                <div style={{ marginTop: 5, fontSize: 11, color: '#60a5fa' }}>{'🔗 ' + cardLinks.length + ' link'}</div>
              )}
              {!$.isProf && cRes && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    background: 'rgba(99,102,241,.15)',
                    border: '1px solid rgba(99,102,241,.3)',
                    borderRadius: 20,
                    padding: '2px 8px',
                    fontSize: 11,
                    color: '#a5b4fc',
                    fontWeight: 700,
                    marginTop: 4,
                  }}
                >
                  🤖 Analisi disponibile
                </div>
              )}
              {c.tipo === 'sondaggio' && c.opzioni && (
                <div style={{ marginTop: 8 }}>
                  {c.opzioni
                    .map(function (o: any) {
                      var pct = totV > 0 ? Math.round(((o.voti || []).length / totV) * 100) : 0;
                      return (
                        <div key={o.id} style={{ marginBottom: 4 }}>
                          {
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: 11,
                                color: 'rgba(255,255,255,.58)',
                                marginBottom: 2,
                              }}
                            >
                              {<span>{o.testo}</span>}
                              {<span>{pct + '%'}</span>}
                            </div>
                          }
                          {
                            <div style={{ height: 3, background: 'rgba(255,255,255,.1)', borderRadius: 3 }}>
                              {<div style={{ height: 3, background: '#6366f1', borderRadius: 3, width: pct + '%' }} />}
                            </div>
                          }
                        </div>
                      );
                    })
                    .concat([
                      <div key="voti" style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 3 }}>
                        {totV + ' voti'}
                      </div>,
                    ])}
                </div>
              )}
              {(c.tipo === 'quiz' || (c.quizDomande && c.quizDomande.length > 0)) && c.quizDomande && (
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {
                    <span style={{ fontSize: 11, color: 'rgba(236,72,153,.8)', fontWeight: 700 }}>
                      {'🧩 ' + c.quizDomande.length + ' domande'}
                    </span>
                  }
                  {c.quizTimer && (
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,.52)' }}>{'⏱ ' + c.quizTimer + ' min'}</span>
                  )}
                </div>
              )}
            </div>
          }
        </div>
      }
      {
        <div style={{ padding: '6px 14px 10px', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {
            <div
              style={{ position: 'relative', display: 'inline-flex' }}
              onMouseEnter={function () {
                if (c.likesBy && c.likesBy.length) $.setLikeHoverCard(c.id);
              }}
              onMouseLeave={function () {
                $.setLikeHoverCard(null);
              }}
            >
              {
                <button
                  aria-label={liked ? 'Rimuovi like' : 'Aggiungi like'}
                  className={($.likeAnimCard === c.id ? 'like-btn-active ' : '') + 'pill-btn'}
                  onClick={function (e: any) {
                    e.stopPropagation();
                    $.toggleLike(c.id);
                  }}
                  style={{
                    background: liked ? 'rgba(99,102,241,.3)' : 'rgba(255,255,255,.08)',
                    border: '1px solid ' + (liked ? 'rgba(99,102,241,.5)' : 'rgba(255,255,255,.1)'),
                    padding: '3px 8px',
                    fontSize: 12,
                    color: liked ? '#a5b4fc' : 'rgba(255,255,255,.65)',
                    gap: 4,
                  }}
                >
                  👍{<span style={{ fontSize: 11, fontWeight: 700 }}>{c.likes || 0}</span>}
                </button>
              }
              {$.likeHoverCard === c.id && c.likesBy && c.likesBy.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 8px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(15,20,40,.97)',
                    border: '1px solid rgba(99,102,241,.4)',
                    borderRadius: 10,
                    padding: '8px 12px',
                    zIndex: 200,
                    minWidth: 120,
                    maxWidth: 220,
                    boxShadow: '0 4px 24px rgba(0,0,0,.5)',
                    pointerEvents: 'none',
                  }}
                >
                  {
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: '#a5b4fc',
                        letterSpacing: 1,
                        marginBottom: 6,
                        textAlign: 'center',
                      }}
                    >
                      👍 LIKE DI
                    </div>
                  }
                  {c.likesBy.map(function (nome: any, i: any) {
                    return (
                      <div
                        key={i}
                        style={{
                          fontSize: 12,
                          color: 'rgba(255,255,255,.85)',
                          padding: '2px 0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        {
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: '#6366f1',
                              display: 'inline-block',
                              flexShrink: 0,
                            }}
                          />
                        }
                        {nome}
                      </div>
                    );
                  })}
                  {
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 0,
                        height: 0,
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderTop: '6px solid rgba(99,102,241,.4)',
                      }}
                    />
                  }
                </div>
              )}
            </div>
          }
          {
            <div style={{ display: 'flex', gap: 3 }}>
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
                    aria-label={'Reagisci con ' + emoji}
                    className="pill-btn"
                    style={{
                      background: hasMe ? 'rgba(99,102,241,.25)' : 'rgba(255,255,255,.06)',
                      border: '1px solid ' + (hasMe ? 'rgba(99,102,241,.4)' : 'rgba(255,255,255,.1)'),
                      padding: '3px 7px',
                      fontSize: 12,
                      color: hasMe ? '#a5b4fc' : 'rgba(255,255,255,.65)',
                    }}
                  >
                    {emoji}
                    {lista.length > 0 && <span style={{ fontSize: 11, fontWeight: 700 }}>{lista.length}</span>}
                  </button>
                );
              })}
            </div>
          }
          {
            <button
              aria-label="Apri commenti"
              className="pill-btn"
              onClick={function (e: any) {
                e.stopPropagation();
                $.openCard(c);
                setTimeout(function () {
                  var ta = document.getElementById('cm-textarea');
                  if (ta) {
                    ta.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    ta.focus();
                  }
                }, 150);
              }}
              style={{
                background: 'rgba(99,102,241,.15)',
                border: '1px solid rgba(99,102,241,.3)',
                padding: '3px 10px',
                fontSize: 12,
                color: '#a5b4fc',
                gap: 4,
                fontWeight: 700,
              }}
            >
              💬 Commenta
              {
                <span
                  style={{
                    fontSize: 11,
                    background: 'rgba(99,102,241,.3)',
                    borderRadius: 10,
                    padding: '0 5px',
                    marginLeft: 2,
                  }}
                >
                  {(c.commenti || []).length || '0'}
                </span>
              }
            </button>
          }
          {$.isProf && !$.simulaSt && (c.commenti || []).length >= 3 && (
            <button
              className="pill-btn"
              onClick={function (e: any) {
                e.stopPropagation();
                $.setShowSommario(c.id);
                if (!$.sommarioResult[c.id]) $.riassuntiCommentiRun(c);
              }}
              style={{
                background: 'rgba(34,197,94,.12)',
                border: '1px solid rgba(34,197,94,.3)',
                color: '#4ade80',
                fontWeight: 700,
              }}
            >
              📝{<span>Riassumi</span>}
            </button>
          )}
          {!$.isProf && !$.simulaSt && (
            <button
              className="pill-btn"
              onClick={function (e: any) {
                e.stopPropagation();
                $.togglePreferito(c.id);
              }}
              style={{
                background: $.preferiti.indexOf(String(c.id)) >= 0 ? 'rgba(245,158,11,.3)' : 'rgba(255,255,255,.06)',
                border:
                  '1px solid ' +
                  ($.preferiti.indexOf(String(c.id)) >= 0 ? 'rgba(245,158,11,.5)' : 'rgba(255,255,255,.1)'),
                fontSize: 13,
                color: $.preferiti.indexOf(String(c.id)) >= 0 ? '#fbbf24' : 'rgba(255,255,255,.45)',
              }}
            >
              {$.preferiti.indexOf(String(c.id)) >= 0 ? '★' : '☆'}
            </button>
          )}
          {<span style={{ flex: 1 }} />}
          {
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', title: $.fmt(c.data) }}>
              {$.timeAgo(c.data)}
            </span>
          }
          {$.isProf && !$.simulaSt && (
            <button
              aria-label="Copia link"
              className="pill-btn"
              onClick={function (e: any) {
                e.stopPropagation();
                var url = window.location.href.split('#')[0] + '#card-' + c.id;
                navigator.clipboard &&
                  navigator.clipboard
                    .writeText(url)
                    .then(function () {
                      $.showToast('Link copiato 🔗', 'ok');
                    })
                    .catch(function () {
                      $.showToast('Link: ' + url, 'ok');
                    });
              }}
              style={{
                background: 'rgba(255,255,255,.06)',
                border: '1px solid rgba(255,255,255,.12)',
                color: 'rgba(255,255,255,.52)',
                fontWeight: 700,
              }}
            >
              🔗
            </button>
          )}
          {$.isProf && !$.simulaSt && (
            <button
              aria-label="Modifica card"
              className="pill-btn"
              onClick={function (e: any) {
                e.stopPropagation();
                $.editCard(c);
              }}
              style={{
                background: 'rgba(59,130,246,.2)',
                border: '1px solid rgba(59,130,246,.4)',
                color: '#60a5fa',
                fontWeight: 700,
              }}
            >
              ✏️
            </button>
          )}
          {isOwner && (
            <button
              aria-label="Modifica card"
              className="pill-btn"
              onClick={function (e: any) {
                e.stopPropagation();
                $.editCard(c);
              }}
              style={{
                background: 'rgba(59,130,246,.2)',
                border: '1px solid rgba(59,130,246,.4)',
                color: '#60a5fa',
                fontWeight: 700,
              }}
            >
              ✏️
            </button>
          )}
          {$.isProf && !$.simulaSt && (
            <button
              aria-label="Duplica card"
              className="pill-btn"
              onClick={function (e: any) {
                $.apriDuplica(c, e);
              }}
              style={{
                background: 'rgba(245,158,11,.15)',
                border: '1px solid rgba(245,158,11,.3)',
                color: '#fbbf24',
                fontWeight: 700,
              }}
            >
              📋
            </button>
          )}
          {$.isProf && !$.simulaSt && (
            <button
              type="button"
              draggable={false}
              aria-label="Copia in altro anno"
              className="pill-btn"
              onMouseDown={function (e: any) {
                e.stopPropagation();
              }}
              onClick={function (e: any) {
                e.stopPropagation();
                $.apriCopiaAnno(c, e);
              }}
              style={{
                background: 'rgba(139,92,246,.15)',
                border: '1px solid rgba(139,92,246,.3)',
                color: '#a78bfa',
                fontWeight: 700,
              }}
            >
              📅
            </button>
          )}
          {$.isProf && !$.simulaSt && (
            <button
              aria-label="Elimina"
              className="pill-btn"
              onClick={function (e: any) {
                e.stopPropagation();
                $.delCardWithUndo(c.id);
              }}
              style={{
                background: 'rgba(239,68,68,.15)',
                border: '1px solid rgba(239,68,68,.3)',
                color: '#f87171',
                fontWeight: 700,
              }}
            >
              🗑️
            </button>
          )}
        </div>
      }
    </div>
  );
}

SB.CardItem = CardItem__;
export default CardItem__;
