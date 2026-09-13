import { memo, useState } from 'react';
import { normalizeLinks } from './app-utils.tsx';
import { avvisoInSospeso, dettaglioMancanti, etichettaAvviso } from './avvisi-classe.ts';
import Countdown from './Countdown.tsx';
// CardItem.jsx · ScuolaBoard

function CardItem__({ $, c, idx }: any) {
  var isLight = !!$.isLight;
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
  // Badge PERSISTENTE (non un toast): se l'annuncio alla classe non è partito,
  // il docente lo vede sulla card finché non è risolto, con i nomi di chi è
  // rimasto senza avviso (quando li conosciamo).
  var avviso = $.isProf && !$.simulaSt && avvisoInSospeso(c, Date.now());
  var mancantiTxt = avviso ? dettaglioMancanti(c) : '';
  var cc = c.classi || ['TUTTE'];
  var tipoCol = $.badgeBg(c.tipo);

  // Azioni secondarie (fissa, riassumi, link, duplica, copia anno, elimina,
  // reazioni) dietro il toggle "⋯": la fila di pillole resta corta e il titolo
  // torna protagonista. Non usiamo l'hover per rivelarle: su tablet e con la
  // tastiera devono restare raggiungibili.
  var [azioniOpen, setAzioniOpen] = useState(false);

  // Badge a riposo: TIPO + al massimo UNO stato (priorità: fissata → nascosta →
  // nuova). Gli altri restano nel DOM ma si rivelano al passaggio del mouse
  // (classe .card-badge-extra, sempre visibili su touch): meno rumore sui chip,
  // più gerarchia tra titolo e contorno.
  var statoBadges: any[] = [];
  if (c.pinned) {
    statoBadges.push({
      key: 'pin',
      label: '📌 FISSATA',
      title: 'Card fissata in cima',
      bg: 'rgba(168,85,247,.25)',
      fg: '#d8b4fe',
      bd: 'rgba(168,85,247,.4)',
    });
  }
  if (nascosta && $.isProf) {
    statoBadges.push({ key: 'nasc', label: 'NASCOSTA', bg: 'rgba(239,68,68,.2)', fg: '#f87171' });
  }
  if (nuova) {
    statoBadges.push({
      key: 'nuovo',
      label: 'NUOVO',
      bg: 'rgba(34,197,94,.25)',
      fg: '#4ade80',
      bd: 'rgba(34,197,94,.4)',
    });
  }

  return (
    <div
      id={'card-' + c.id}
      key={c.id}
      className={
        'card-wrap fadein' +
        ($.bulkMode && $.isProf ? ' bulk-card' : '') +
        ($.bulkMode && $.isProf && $.bulkSelected.indexOf(String(c.id)) >= 0 ? ' bulk-selected' : '') +
        // Zona "importante": le card fissate stanno in cima per tutti, quindi si
        // vedono da lontano (alone viola via CSS .card-pinned).
        (c.pinned ? ' card-pinned' : '')
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
          // Niente margin: la spaziatura tra le card è del gap della griglia
          // (CardGrid: grid row-major) — un margin qui la raddoppierebbe.
          background: nascosta ? 'rgba(255,255,255,.02)' : 'rgba(255,255,255,.055)',
          backdropFilter: 'blur(12px)',
          border: '1px solid ' + (nascosta ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.09)'),
          borderRadius: 18,
          overflow: 'hidden',
          opacity: nascosta ? 0.45 : 1,
          transition: 'transform .2s cubic-bezier(.22,1,.36,1),box-shadow .2s,opacity .2s',
          borderTop: '3px solid ' + tipoBorder,
          // Entrata a cascata: le card compaiono in sequenza (max 300ms) invece
          // di lampeggiare tutte insieme al primo render.
          animationDelay: Math.min(idx || 0, 12) * 25 + 'ms',
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
            // Alone del colore del tipo nell'angolo: prima qui c'era l'emoji
            // gigante a opacità .06 (praticamente invisibile, quindi solo
            // rumore nel DOM). Dà carattere senza coprire il testo.
            <div
              style={{
                position: 'absolute',
                right: -30,
                bottom: -30,
                width: 130,
                height: 130,
                borderRadius: '50%',
                background: 'radial-gradient(circle, ' + tipoCol + '2e 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />
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
                  loading="lazy"
                  decoding="async"
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
            <div
              style={{
                padding: '12px 14px 6px',
                // Identità del tipo: velatura del colore del tipo sull'intestazione.
                // Serve a riconoscere il tipo a colpo d'occhio (anche proiettata).
                background: nascosta ? 'transparent' : 'linear-gradient(180deg,' + tipoCol + '1c 0%, transparent 65%)',
              }}
            >
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
                          className={'badge-chip'}
                          style={{
                            background: tipoCol,
                            color: '#fff',
                            padding: '2px 8px',
                            fontWeight: 800,
                            letterSpacing: 0.5,
                            boxShadow: '0 2px 8px ' + tipoCol + '55',
                          }}
                        >
                          {$.tipoIcon(c.tipo) + ' ' + (c.tipo || '').toUpperCase()}
                        </span>
                      }
                      {statoBadges.map(function (b: any, i: number) {
                        return (
                          <span
                            key={b.key}
                            className={'badge-chip' + (i > 0 ? ' card-badge-extra' : '')}
                            title={b.title}
                            style={{
                              background: b.bg,
                              color: b.fg,
                              padding: '2px 6px',
                              fontWeight: 800,
                              border: b.bd ? '1px solid ' + b.bd : 'none',
                            }}
                          >
                            {b.label}
                          </span>
                        );
                      })}
                      {avviso && (
                        <span
                          className="badge-chip card-avviso"
                          title={
                            "La classe non ha ancora ricevuto l'annuncio" +
                            (mancantiTxt ? ' — ' + mancantiTxt : '') +
                            ': riprovo alla prossima apertura (o premi Riprova)'
                          }
                          style={{
                            background: 'rgba(245,158,11,.22)',
                            color: '#fbbf24',
                            padding: '2px 6px',
                            fontWeight: 800,
                            border: '1px solid rgba(245,158,11,.45)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          {etichettaAvviso(c)}
                          {typeof $.riprovaAnnuncio === 'function' && (
                            <button
                              type="button"
                              aria-label="Riprova avviso"
                              title="Riprova ora l'annuncio alla classe"
                              onClick={function (e: any) {
                                e.stopPropagation();
                                $.riprovaAnnuncio(c);
                              }}
                              style={{
                                border: 'none',
                                background: 'rgba(245,158,11,.35)',
                                color: '#fde68a',
                                borderRadius: 10,
                                padding: '1px 7px',
                                fontSize: 10,
                                fontWeight: 800,
                                cursor: 'pointer',
                              }}
                            >
                              ↻ Riprova
                            </button>
                          )}
                        </span>
                      )}
                      {$.isProf && cc.indexOf('TUTTE') < 0 && cc.length > 0 && (
                        <span
                          className="badge-chip card-badge-extra"
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
                          className="badge-chip card-badge-extra"
                          style={{
                            background: 'rgba(239,68,68,.2)',
                            color: '#f87171',
                          }}
                        >
                          Solo prof
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
                    fontSize: 15,
                    color: nascosta ? (isLight ? '#64748b' : 'rgba(255,255,255,.58)') : isLight ? '#0f172a' : '#f1f5f9',
                    lineHeight: 1.35,
                    marginBottom: 5,
                    letterSpacing: 0.1,
                    // Titoli lunghi: max 2 righe, così le righe della griglia
                    // restano uniformi (prima potevano allungarsi a piacere).
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {c.titolo}
                </div>
              }
              {c.testo && (
                <div
                  style={{
                    fontSize: 11,
                    color: isLight ? '#475569' : 'rgba(255,255,255,.58)',
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
              {c.scadenza && <Countdown scadenza={c.scadenza} />}
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
                    order: 1,
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
          {azioniOpen && $.isProf && !$.simulaSt && (
            <button
              aria-label={c.pinned ? 'Togli il pin' : 'Fissa in cima'}
              title={c.pinned ? 'Togli il pin' : 'Fissa in cima'}
              className="pill-btn"
              onClick={function (e: any) {
                e.stopPropagation();
                $.togglePin(c.id);
              }}
              style={{
                order: 8,
                background: c.pinned ? 'rgba(168,85,247,.3)' : 'rgba(255,255,255,.08)',
                border: '1px solid ' + (c.pinned ? 'rgba(168,85,247,.5)' : 'rgba(255,255,255,.1)'),
                padding: '3px 8px',
                fontSize: 12,
                color: c.pinned ? '#d8b4fe' : 'rgba(255,255,255,.65)',
              }}
            >
              📌
            </button>
          )}
          {azioniOpen && (
            <div style={{ display: 'flex', gap: 3, order: 9 }}>
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
          )}
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
                order: 2,
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
          {azioniOpen && $.isProf && !$.simulaSt && (c.commenti || []).length >= 3 && (
            <button
              className="pill-btn"
              onClick={function (e: any) {
                e.stopPropagation();
                $.setShowSommario(c.id);
                if (!$.sommarioResult[c.id]) $.riassuntiCommentiRun(c);
              }}
              style={{
                order: 10,
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
                order: 3,
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
          {
            // Toggle delle azioni secondarie: sta nella riga primaria (order 4)
            // così «👍 💬 ★/✏️ ⋯» è tutto ciò che si vede a riposo.
            <button
              aria-label="Altre azioni"
              title="Altre azioni"
              aria-expanded={azioniOpen}
              className="pill-btn"
              onClick={function (e: any) {
                e.stopPropagation();
                setAzioniOpen(function (v: boolean) {
                  return !v;
                });
              }}
              style={{
                order: 4,
                background: azioniOpen ? 'rgba(99,102,241,.28)' : 'rgba(255,255,255,.06)',
                border: '1px solid ' + (azioniOpen ? 'rgba(99,102,241,.45)' : 'rgba(255,255,255,.12)'),
                color: azioniOpen ? '#c7d2fe' : 'rgba(255,255,255,.62)',
                fontWeight: 800,
              }}
            >
              {azioniOpen ? '×' : '⋯'}
            </button>
          }
          {<span style={{ flex: 1, order: 5 }} />}
          {
            <span title={$.fmt(c.data)} style={{ order: 6, fontSize: 11, color: 'rgba(255,255,255,.45)' }}>
              {$.timeAgo(c.data)}
            </span>
          }
          {
            // A capo prima delle azioni secondarie: flex-basis 100% + order 7.
            <span aria-hidden="true" style={{ order: 7, flexBasis: '100%', height: 0, marginTop: 6 }} />
          }
          {azioniOpen && $.isProf && !$.simulaSt && (
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
                order: 11,
                background: 'rgba(255,255,255,.06)',
                border: '1px solid rgba(255,255,255,.12)',
                color: 'rgba(255,255,255,.52)',
                fontWeight: 700,
              }}
            >
              🔗
            </button>
          )}
          {azioniOpen && $.isProf && !$.simulaSt && (
            <button
              aria-label="Modifica card"
              className="pill-btn"
              onClick={function (e: any) {
                e.stopPropagation();
                $.editCard(c);
              }}
              style={{
                order: 12,
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
                // L'autore vede la sua ✏️ tra le azioni primarie: è l'azione
                // che usa di più e non deve stare dietro il menu.
                order: 3,
                background: 'rgba(59,130,246,.2)',
                border: '1px solid rgba(59,130,246,.4)',
                color: '#60a5fa',
                fontWeight: 700,
              }}
            >
              ✏️
            </button>
          )}
          {azioniOpen && $.isProf && !$.simulaSt && (
            <button
              aria-label="Duplica card"
              className="pill-btn"
              onClick={function (e: any) {
                $.apriDuplica(c, e);
              }}
              style={{
                order: 13,
                background: 'rgba(245,158,11,.15)',
                border: '1px solid rgba(245,158,11,.3)',
                color: '#fbbf24',
                fontWeight: 700,
              }}
            >
              📋
            </button>
          )}
          {azioniOpen && $.isProf && !$.simulaSt && (
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
                order: 14,
                background: 'rgba(139,92,246,.15)',
                border: '1px solid rgba(139,92,246,.3)',
                color: '#a78bfa',
                fontWeight: 700,
              }}
            >
              📅
            </button>
          )}
          {azioniOpen && $.isProf && !$.simulaSt && (
            <button
              aria-label="Elimina"
              className="pill-btn"
              onClick={function (e: any) {
                e.stopPropagation();
                $.delCardWithUndo(c.id);
              }}
              style={{
                order: 15,
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

// Memo con comparatore mirato (C3): CardItem legge SOLO un sottoinsieme di `$`
// (scalari + refs stabili) oltre alla card `c`. Il comparatore ignora le
// funzioni: i handler in `$` sono stabili per identità o leggono via ref
// (cardsHookRef.current), quindi un riferimento vecchio continua a lavorare
// su dati freschi. Senza questo, ogni cambio di uiValue (es. likeHoverCard,
// toasts, bulkMode) ri-renderizzava TUTTE le card della griglia.
function cardItemAreEqual(prev: any, next: any) {
  if (prev.c !== next.c) return false;
  // idx guida solo il ritardo dell'entrata a cascata: se cambia (riordino), la
  // card va ri-renderizzata per non trascinarsi dietro il delay vecchio.
  if (prev.idx !== next.idx) return false;
  var a = prev.$;
  var b = next.$;
  // Campi scalari/ref che la card renderizza direttamente
  if (a.isLight !== b.isLight) return false;
  if (a.isProf !== b.isProf) return false;
  if (a.simulaSt !== b.simulaSt) return false;
  if (a.bulkMode !== b.bulkMode) return false;
  if (a.bulkSelected !== b.bulkSelected) return false;
  if (a.likeHoverCard !== b.likeHoverCard) return false;
  if (a.likeAnimCard !== b.likeAnimCard) return false;
  if (a.myLikes !== b.myLikes) return false;
  if (a.seenRef !== b.seenRef) return false;
  if (a.user !== b.user) return false;
  // `classiCustom` guida il colore delle chip classe; `preferiti` lo stato ★
  if (a.classiCustom !== b.classiCustom) return false;
  if (a.preferiti !== b.preferiti) return false;
  // aiMap è un oggetto che cambia identità a ogni update AI: se cambia, la
  // card può mostrare/ nascondere "Analisi disponibile" / riassunti.
  if (a.aiMap !== b.aiMap) return false;
  // sommarioResult guida la visibilità del bottone "📝 Riassumi" per il prof.
  if (a.sommarioResult !== b.sommarioResult) return false;
  return true;
}

export default memo(CardItem__, cardItemAreEqual);
