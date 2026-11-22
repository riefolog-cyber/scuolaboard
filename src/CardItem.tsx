import { memo, useState } from 'react';
import { normalizeLinks } from './app-utils.tsx';
import { avvisoInSospeso, dettaglioMancanti, etichettaAvviso } from './avvisi-classe.ts';
import { classeContestoCommenti, commentiVisibili, mostraTuttiCommenti } from './commenti-classe.ts';
import Countdown from './Countdown.tsx';
import { temaTipo, etichettaTipo } from './card-tipo-tema.ts';
import { statoScadenza, labelScadenza, coloreScadenza } from './urgenza.ts';
import { testoSecondario } from './grafica-testi.ts';
import { badgeStato } from './stato-card.ts';
// CardItem.jsx · ScuolaBoard

function CardItem__({ $, c, idx }: any) {
  var isLight = !!$.isLight;
  // Conteggio commenti per-classe: lo studente (e il prof filtrato) vede il
  // numero della SUA discussione, non il totale delle altre classi. Il docente
  // su 'tutte' vede il totale. Le letture di $.classeCorrente/$.filterClasse/
  // $.previewClasse sono volutamente esplicite: il test carditem-memo-campi le
  // pretende nell'elenco confrontato (regola 9).
  var contestoPerCommenti = {
    isProf: $.isProf,
    simulaSt: $.simulaSt,
    classeCorrente: $.classeCorrente,
    previewClasse: $.previewClasse,
    filterClasse: $.filterClasse,
  };
  var nCommentiVisibili = commentiVisibili(
    c.commenti,
    classeContestoCommenti(contestoPerCommenti),
    mostraTuttiCommenti(contestoPerCommenti)
  ).length;
  var totV = c.opzioni
    ? c.opzioni.reduce(function (a: any, o: any) {
        return a + (o.voti || []).length;
      }, 0)
    : 0;
  var liked = $.myLikes.current.has(String(c.id));
  var aiD = ($.aiMap && $.aiMap[String(c.id)]) || {};
  var cRes = c.aiAnalisi || (aiD && aiD.analisi);
  // NB: niente "isOwner" per lo studente. Esisteva e offriva a chiunque fosse l'autore
  // la modifica della card, ma le Firestore Rules non lo permettono (update/carta
  // studente ammette solo commenti, like, reazioni, voti, visto, ordine): la
  // scrittura veniva negata e il toast diceva comunque "Card aggiornata". Dopo
  // l'approvazione la card è del docente, e l'ho verificato che il caso non è una
  // rarità: appCard mette proposta=false, quindi il proponente diventava isOwner.
  var cardLinks = normalizeLinks(c);
  var nascosta = c.visibile === false;
  var nuova = !$.seenRef.current.has(String(c.id));
  // Badge PERSISTENTE (non un toast): se l'annuncio alla classe non è partito,
  // il docente lo vede sulla card finché non è risolto, con i nomi di chi è
  // rimasto senza avviso (quando li conosciamo).
  var avviso = $.isProf && !$.simulaSt && avvisoInSospeso(c, Date.now());
  var mancantiTxt = avviso ? dettaglioMancanti(c) : '';
  var cc = c.classi || ['TUTTE'];
  var tema = temaTipo(c.tipo);
  var tipoCol = tema.color;

  // Azioni secondarie (fissa, riassumi, link, duplica, copia anno, elimina,
  // reazioni) dietro il toggle "⋯": la fila di pillole resta corta e il titolo
  // torna protagonista. Non usiamo l'hover per rivelarle: su tablet e con la
  // tastiera devono restare raggiungibili.
  var [azioniOpen, setAzioniOpen] = useState(false);
  // Blur-up leggero della copertina: la miniatura (copertinaThumb, già
  // generata) parte sfocata e si "affila" al caricamento. Niente campo nuovo:
  // per le card vecchie senza thumb si usa l'originale, con lo stesso effetto.
  var copertinaSrc = c.copertinaThumb || c.copertina;
  var [copertinaLoadedSrc, setCopertinaLoadedSrc] = useState<string | null>(null);
  var copertinaCaricata = copertinaLoadedSrc === copertinaSrc;

  // Badge a riposo: TIPO + al massimo UNO stato (priorità: fissata → nascosta →
  // nuova). Gli altri restano nel DOM ma si rivelano al passaggio del mouse
  // (classe .card-badge-extra, sempre visibili su touch): meno rumore sui chip,
  // più gerarchia tra titolo e contorno.
  var statoBadges = badgeStato({ pinned: !!c.pinned, nascosta: nascosta, nuova: nuova, isProf: !!$.isProf });

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
        var tipoBorder = nascosta ? 'rgba(255,255,255,.08)' : tipoCol;
        return {
          // Niente margin: la spaziatura tra le card è del gap della griglia
          // (CardGrid: grid row-major) — un margin qui la raddoppierebbe.
          background: nascosta ? 'rgba(255,255,255,.02)' : 'var(--sb-surface)',
          backdropFilter: 'blur(14px)',
          border: '1px solid ' + (nascosta ? 'rgba(255,255,255,.05)' : 'var(--sb-line)'),
          borderRadius: 20,
          overflow: 'hidden',
          opacity: nascosta ? 0.45 : 1,
          transition: 'transform .2s cubic-bezier(.22,1,.36,1),box-shadow .2s,opacity .2s',
          borderTop: '3px solid ' + tipoBorder,
          boxShadow: nascosta ? 'none' : '0 10px 26px rgba(0,0,0,.10)',
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
            // La misura dell'apertura parte dentro `openCard` (unico punto): qui
            // il click è solo uno dei tanti percorsi che aprono una card.
            $.openCard(c);
          }}
        >
          {
            // Pattern identitario del tipo: dà carattere senza coprire il testo.
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                right: -20,
                top: -10,
                width: 180,
                height: 180,
                borderRadius: '50%',
                background: tema.pattern,
                pointerEvents: 'none',
                opacity: 1,
              }}
            />
          }
          {c.copertina && (
            <div
              className="card-cover"
              style={{
                width: '100%',
                background: 'var(--sb-hero-bg)',
                borderRadius: '16px 16px 0 0',
                overflow: 'hidden',
                position: 'relative',
                cursor: 'pointer',
                aspectRatio: '16 / 9',
                maxHeight: 210,
              }}
              onClick={function (e: any) {
                e.stopPropagation();
                $.setLightbox({ url: c.copertina, didascalia: c.titolo });
              }}
            >
              <img
                src={copertinaSrc}
                alt=""
                loading="lazy"
                decoding="async"
                onLoad={function () {
                  setCopertinaLoadedSrc(copertinaSrc);
                }}
                onError={function () {
                  setCopertinaLoadedSrc(copertinaSrc);
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  filter: copertinaCaricata ? 'saturate(1.02)' : 'blur(14px) saturate(.9)',
                  transform: copertinaCaricata ? 'scale(1)' : 'scale(1.05)',
                  opacity: copertinaCaricata ? 1 : 0.85,
                  transition: 'filter .4s ease, transform .4s ease, opacity .4s ease',
                }}
              />
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(2,6,23,.05) 0%, rgba(2,6,23,.18) 45%, rgba(2,6,23,.55) 100%)',
                  pointerEvents: 'none',
                }}
              />
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: 10,
                  bottom: 10,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 9px',
                  borderRadius: 999,
                  background: 'rgba(15,23,42,.45)',
                  border: '1px solid rgba(255,255,255,.18)',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 800,
                  backdropFilter: 'blur(6px)',
                }}
              >
                {tema.icon} {etichettaTipo(c.tipo)}
              </div>
              {c.immagini && c.immagini.length > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 10,
                    right: 10,
                    background: 'rgba(15,23,42,.55)',
                    color: '#fff',
                    borderRadius: 999,
                    padding: '3px 8px',
                    fontSize: 11,
                    fontWeight: 700,
                    border: '1px solid rgba(255,255,255,.16)',
                    backdropFilter: 'blur(6px)',
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
                padding: '14px 15px 8px',
                // Identità del tipo: velatura/pattern del tipo sull'intestazione.
                background: nascosta ? 'transparent' : tema.gradient,
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
                            background: tema.chipBg,
                            color: '#fff',
                            padding: '3px 9px',
                            fontWeight: 800,
                            letterSpacing: 0.5,
                            boxShadow: '0 4px 12px ' + tipoCol + '55',
                            border: '1px solid rgba(255,255,255,.12)',
                          }}
                        >
                          {tema.icon + ' ' + etichettaTipo(c.tipo)}
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
                            color: 'var(--c-warn, #fbbf24)',
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
                            color: 'var(--c-danger, #f87171)',
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
                    color: testoSecondario(isLight),
                    marginBottom: 5,
                    cursor: 'grab',
                    userSelect: 'none',
                    letterSpacing: 0.2,
                  }}
                >
                  ☰ trascina per riordinare
                </div>
              )}
              {
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 16,
                    color: nascosta ? 'var(--sb-text-3)' : 'var(--sb-text-1)',
                    lineHeight: 1.3,
                    marginBottom: 6,
                    letterSpacing: 0.05,
                    // Titoli lunghi: max 2 righe, così le righe della griglia
                    // restano uniformi (prima potevano allungarsi a piacere).
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {nuova && (
                    <span
                      aria-hidden="true"
                      className="pulse"
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--c-success, #4ade80)',
                        marginRight: 7,
                        verticalAlign: 'middle',
                        boxShadow: '0 0 0 0 rgba(74,222,128,.6)',
                      }}
                    />
                  )}
                  {c.titolo}
                </div>
              }
              {c.testo && (
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--sb-text-2)',
                    lineHeight: 1.55,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    marginTop: 1,
                  }}
                >
                  {c.testo}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {c.scadenza && <Countdown scadenza={c.scadenza} />}
                {function () {
                  var st = statoScadenza(c.scadenza);
                  if (st === 'none' || st === 'ok') return null;
                  var col = coloreScadenza(st);
                  return <span className="urgency-badge" style={{ background: col.bg, color: col.fg, borderColor: col.bd }}>⏰ {labelScadenza(st)}</span>;
                }()}
              </div>
              {cardLinks.length > 0 && (
                <div style={{ marginTop: 5, fontSize: 11, color: '#60a5fa' }}>{'🔗 ' + cardLinks.length + ' link'}</div>
              )}
              {!$.isProf && cRes && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    background: 'rgba(var(--c-primary-rgb),.15)',
                    border: '1px solid rgba(var(--c-primary-rgb),.3)',
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
                              {<div style={{ height: 3, background: 'var(--c-primary, #6366f1)', borderRadius: 3, width: pct + '%' }} />}
                            </div>
                          }
                        </div>
                      );
                    })
                    .concat([
                      <div key="voti" style={{ fontSize: 11, color: testoSecondario(isLight), marginTop: 3 }}>
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
        <div style={{ padding: '8px 15px 12px', display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
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
                    background: liked ? 'rgba(var(--c-primary-rgb),.3)' : 'rgba(255,255,255,.08)',
                    border: '1px solid ' + (liked ? 'rgba(var(--c-primary-rgb),.5)' : 'rgba(255,255,255,.1)'),
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
                    border: '1px solid rgba(var(--c-primary-rgb),.4)',
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
                              background: 'var(--c-primary, #6366f1)',
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
                        borderTop: '6px solid rgba(var(--c-primary-rgb),.4)',
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
                      background: hasMe ? 'rgba(var(--c-primary-rgb),.25)' : 'rgba(255,255,255,.06)',
                      border: '1px solid ' + (hasMe ? 'rgba(var(--c-primary-rgb),.4)' : 'rgba(255,255,255,.1)'),
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
                background: 'rgba(var(--c-primary-rgb),.15)',
                border: '1px solid rgba(var(--c-primary-rgb),.3)',
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
                    background: 'rgba(var(--c-primary-rgb),.3)',
                    borderRadius: 10,
                    padding: '0 5px',
                    marginLeft: 2,
                  }}
                >
                  {nCommentiVisibili || '0'}
                </span>
              }
            </button>
          }
          {azioniOpen && $.isProf && !$.simulaSt && nCommentiVisibili >= 3 && (
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
                color: 'var(--c-success, #4ade80)',
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
                color: $.preferiti.indexOf(String(c.id)) >= 0 ? 'var(--c-warn, #fbbf24)' : testoSecondario(isLight),
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
                background: azioniOpen ? 'rgba(var(--c-primary-rgb),.28)' : 'rgba(255,255,255,.06)',
                border: '1px solid ' + (azioniOpen ? 'rgba(var(--c-primary-rgb),.45)' : 'rgba(255,255,255,.12)'),
                color: azioniOpen ? '#c7d2fe' : 'rgba(255,255,255,.62)',
                fontWeight: 800,
              }}
            >
              {azioniOpen ? '×' : '⋯'}
            </button>
          }
          {<span style={{ flex: 1, order: 5 }} />}
          {
            <span title={$.fmt(c.data)} style={{ order: 6, fontSize: 11, color: testoSecondario(isLight) }}>
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
                color: 'var(--c-warn, #fbbf24)',
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
                // chiediEliminazione: con il filtro classe attivo chiede se
                // togliere la card solo da quella classe (vedi card-classi.ts).
                $.chiediEliminazione(c.id);
              }}
              style={{
                order: 15,
                background: 'rgba(239,68,68,.15)',
                border: '1px solid rgba(239,68,68,.3)',
                color: 'var(--c-danger, #f87171)',
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
//
// ── Perché due liste esplicite e non 14 `if` a mano ────────────────────────
// Il pericolo di questo comparatore è che il guasto è SILENZIOSO: domani
// aggiungi a CardItem una lettura di `$.qualcosa` e non lo metti fra i campi
// confrontati → la card smette di aggiornarsi e nessun test, nessun errore, nessun
// warning: si vede solo che "la card non reagisce". È già successo tre volte in
// questo repo, ogni volta nella stessa forma (corretto un call site, gli altri
// lasciati fuori).
// Perciò i campi sono due elenchi NOME per elencati, e il test
// src/carditem-memo-campi.test.ts fallisce se in CardItem compare un `$.campo`
// che non è in nessuno dei due. Aggiungere una lettura è quindi un atto
// consapevole: o la aggiungi a CAMPI_CARD_ITEM (va ri-renderizzata) o a
// CAMPI_NON_CONFRONTATI (devi poter spiegare perché non serve).

/** Campi di `$` confrontati: se ne cambia l'identità, la card si ri-renderizza. */
export var CAMPI_CARD_ITEM: string[] = [
  'isLight', // tema chiaro/scuro
  'isProf', // badge e azioni da docente
  'simulaSt', // anteprima studente
  'bulkMode', // barra selezione multipla
  'bulkSelected', // id selezionati nel blocco
  'likeHoverCard', // stato hover del like
  'likeAnimCard', // animazione del like
  'myLikes', // Set dei like dell'utente
  'seenRef', // Set delle card già viste
  'user', // nome utente (azioni, "modifica di")
  'classiCustom', // colore delle chip classe
  'preferiti', // stato ★
  'aiMap', // "Analisi disponibile" / riassunti
  'sommarioResult', // visibilità del bottone "Riassumi" (prof)
  'classeCorrente', // conteggio commenti per-classe (studente)
  'filterClasse', // conteggio commenti per-classe (prof filtrato)
  'previewClasse', // conteggio commenti per-classe (simulaSt)
];

/**
 * Campi di `$` letti ma NON confrontati: handler e utility la cui identità è
 * garantita stabile da un `useMemo(..., [])` in AppProvider (`appHandlerCtx`,
 * `__handlers`) o che leggono dati freschi via ref. Non confrontarli è ciò che
 * evita il ri-render di tutta la griglia a ogni keystroke: AGGIUNGERCI DENTRO
 * qualcosa che non è stabile per identità significa che la card userà una
 * chiusura vecchia.
 */
export var CAMPI_NON_CONFRONTATI: string[] = [
  // handler di azione (stabili: appHandlerCtx / __handlers sono memoizzati su [])
  'openCard',
  'editCard',
  'toggleLike',
  'togglePin',
  'toggleVisibile',
  'togglePreferito',
  'toggleReazione',
  'riassuntiCommentiRun',
  'apriDuplica',
  'apriCopiaAnno',
  'delCardWithUndo',
  // Chiede quale classe coinvolge l'eliminazione quando il filtro classe è
  // attivo (vedi card-classi.ts). Stabile per identità: useCallback deps [] che
  // legge cards e filtro classe da cardsHookRef.
  'chiediEliminazione',
  'riprovaAnnuncio',
  'setShowSommario',
  'setLightbox',
  'setLikeHoverCard',
  'showToast',
  // drag & drop
  'onDragStart',
  'onDragOver',
  'onDragLeave',
  'onDragEnd',
  'onDrop',
  // utility/format (funzioni pure dal modulo utils)
  'badgeBg',
  'classeColor',
  'tipoIcon',
  'timeAgo',
  'fmt',
  'myName',
  // dati già coperti dai campi confrontati o non influenzano il render
  'CLASSI_DEFAULT',
];

// Esportata solo per i test: il comportamento del memo è un contratto (quando
// ri-renderizza e quando no), non un dettaglio interno.
export function cardItemAreEqual(prev: any, next: any) {
  if (prev.c !== next.c) return false;
  // idx guida solo il ritardo dell'entrata a cascata: se cambia (riordino), la
  // card va ri-renderizzata per non trascinarsi dietro il delay vecchio.
  if (prev.idx !== next.idx) return false;
  var a = prev.$;
  var b = next.$;
  for (var i = 0; i < CAMPI_CARD_ITEM.length; i++) {
    var campo = CAMPI_CARD_ITEM[i];
    if (a[campo] !== b[campo]) return false;
  }
  return true;
}

export default memo(CardItem__, cardItemAreEqual);
