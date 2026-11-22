// CardDetail.jsx · ScuolaBoard
import { useContext, useEffect, useRef, useState } from 'react';
import { normalizeLinks } from './app-utils.tsx';
import { scrollInVista } from './utils/scroll.ts';
import { testoSecondario } from './grafica-testi.ts';
import { segnaCardPronta } from './utils/apertura-card.ts';
import { sbSafeUrl } from './utils/format.ts';
import { allegatoIcona, allegatoNome, isHtmlAllegato, urlAllegatoSicuro } from './allegati.ts';
import { caricaAllegati } from './allegati-card-servizio.ts';
import BadgeAi from './BadgeAi.tsx';
import FormContext from './contexts/FormContext.tsx';
import { useCountdown, countdownStr } from './Countdown.tsx';
import { temaTipo, etichettaTipo } from './card-tipo-tema.ts';

// Import STATICI di proposito: il `lazy` è stato provato e scartato. Questi
// quattro pannelli sono sempre nell'albero (la condizione quiz/prof è DENTRO il
// componente), quindi con `lazy` il chunk si scaricherebbe comunque all'apertura
// di ogni card: quattro richieste in più e un pop-in, senza risparmio. Per
// renderlo utile servirebbe spostare la condizione fuori, duplicandola.
import QuizPanel from './carddetail/QuizPanel.tsx';
import AIPanel from './carddetail/AIPanel.tsx';
import PartecipazionePanel from './carddetail/PartecipazionePanel.tsx';
import DomandeLiberePanel from './carddetail/DomandeLiberePanel.tsx';
import CommentsSection from './carddetail/CommentsSection.tsx';
import RifiutaModal from './carddetail/RifiutaModal.tsx';
import AllegatoHtmlPreview from './carddetail/AllegatoHtmlPreview.tsx';
import { chiaveAllegato, giaCompletato, leggiConsegne, registraConsegna } from './allegato-consegna-servizio.ts';

function CardDetail__({ $: props$ }: any) {
  // Merge del FormContext (split di UIContext): i pannelli (commenti, quiz,
  // rifiuta) leggono editingCm/replyTesto/nc/qRisposte… che ora vivono qui.
  var $ = Object.assign({}, props$, useContext(FormContext));
  var c = $.showCard;
  // Hook chiamato SEMPRE (prima dell'early return): il timer locale aggiorna
  // solo questo pannello, non l'intera app (vedi Countdown.tsx).
  var cdNow = useCountdown(c && c.scadenza);
  // Allegato HTML in anteprima: stato locale del pannello (non nel FormContext),
  // perché non deve sopravvivire alla chiusura della card.
  var [htmlPreview, setHtmlPreview] = useState<any>(null);
  var [activeSection, setActiveSection] = useState('cd-testo');
  var scrollRef = useRef<any>(null);
  // Le consegne di questo studente sugli allegati già finiti. Servono solo per
  // decidere che cosa è ancora riapribile, quindi si leggono una volta sola
  // all'apertura della card e non seguono i cambi di card.
  var [consegne, setConsegne] = useState<Record<string, string>>({});
  // Contenuto degli allegati: la card porta solo i metadati ({id, name, type,
  // size}), i file stanno in `cards/{id}/allegati`. Si leggono TUTTI all'apertura
  // (una sola query): nomi e anteprime sono pronti subito e non serve gestire un
  // caricamento per ogni riga. Le card vecchie hanno ancora `url` inline e non
  // passano di qui.
  // `cardId` sta DENTRO lo stato: senza, il contenuto letto per la card
  // precedente resterebbe nella mappa e una riga della card nuova potrebbe
  // mostrare il file sbagliato (le dupliche conservano gli stessi id dei file).
  var [allegatiFile, setAllegatiFile] = useState<any>({ cardId: null, mappa: {} });
  // Blur-up leggero della copertina nel dettaglio (immagine piena).
  var [copertinaLoadedSrc, setCopertinaLoadedSrc] = useState<string | null>(null);
  var allegatiCard = (c && c.allegati) || [];
  // Mappa dei contenuti SOLO se è stata letta per la card aperta adesso: `null`
  // significa "non lo so ancora", che è diverso da "il file non c'è".
  var contenutiAllegati = c && String(allegatiFile.cardId) === String(c.id) ? allegatiFile.mappa : null;
  // Firma stabile degli id: `allegati` è un array nuovo a ogni render, quindi non
  // può stare nelle dipendenze dell'effetto (rileggerebbe Firestore a ogni render).
  var firmaAllegati = allegatiCard
    .map(function (al: any) {
      return String(al && al.id);
    })
    .join('|');

  // Carica il contenuto SOLO se qualche allegato non ha già l'url inline.
  useEffect(
    function () {
      var cardId = c && c.id;
      var senzaUrl = allegatiCard.filter(function (al: any) {
        return al && !al.url;
      });
      if (!cardId || !senzaUrl.length) return;
      var vivo = true;
      caricaAllegati(cardId)
        .then(function (docs) {
          if (!vivo) return;
          var mappa: Record<string, any> = {};
          docs.forEach(function (d: any) {
            mappa[String(d.id)] = d.url;
          });
          setAllegatiFile(function (precedente: any) {
            // Un errore di lettura non deve cancellare un contenuto già mostrato
            // (stessa regola dello snapshot in firestore-sync): `caricaAllegati`
            // degrada a lista vuota e NON dice se è "nessun file" o "lettura
            // fallita", quindi se per QUESTA card avevamo già dei contenuti e ora
            // arriva una mappa vuota, si tiene quella vecchia. Le righe tolte
            // davvero dalla card spariscono comunque, perché è `allegati` a
            // cambiarle (e quindi `firmaAllegati`).
            if (
              !docs.length &&
              precedente &&
              String(precedente.cardId) === String(cardId) &&
              Object.keys(precedente.mappa || {}).length
            ) {
              return precedente;
            }
            return { cardId: cardId, mappa: mappa };
          });
        })
        // caricaAllegati non lancia (ha il try/catch dentro): il catch serve a
        // marcare la catena come gestita, non a gestire un errore previsto.
        .catch(function () {});
      return function () {
        vivo = false;
      };
    },
    [c && c.id, firmaAllegati]
  );

  // Carica le consegne ALL'APERTURA della card. Non si rilegge a ogni render:
  // dentro la card si registrano solo allegati di questa stessa card, quindi
  // rileggere non cambierebbe niente e farebbe una lettura per ogni render.
  useEffect(function () {
    var u = $.user && $.user.uid;
    if (!u) return;
    var visto = false;
    //  + "leggiConsegne" + @ non rigetta mai (ha un try/catch dentro e restituisce
    //  + "{}" + @ in ogni caso di errore). Il  + ".catch" + @ qui sotto non serve per
    // sicurezza: serve perché se quella funzione cambiasse, questa catena
    // resterebbe scoperta. Il presidio promise-catch.test.ts la segnala come
    // tale, e ha ragione: finora non lo sapeva nessuno.
    leggiConsegne(u)
      .then(function (r) {
        if (visto) return;
        setConsegne(r);
      })
      .catch(function () {
        // Senza consegne lette l'allegato resta riapribile: e' il default
        // sensato (nel dubbio si lascia fare, non si blocca lo studente).
      });
    return function () {
      visto = true;
    };
  }, [$.user && $.user.uid]);

  // Chiude la misura aperta da `openCard`: la durata (click → dettaglio pronto)
  // la mostra il pannello Diagnostica, solo con SB_DEBUG. Sta PRIMA dell'early
  // return: un hook dichiarato dopo un return condizionale cambia il numero di
  // hook fra un render e l'altro e React lancia «Rendered more hooks than during
  // the previous render». La dipendenza su `c.id` fa ripartire la misura se il
  // componente resta montato mentre la card cambia.
  useEffect(
    function () {
      if (c) segnaCardPronta();
    },
    [c && c.id]
  );

  if (!c) return null;
  var isLight = !!$.isLight;
  var tema = temaTipo(c.tipo);
  var totV = c.opzioni
    ? c.opzioni.reduce(function (a: any, o: any) {
        return a + (o.voti || []).length;
      }, 0)
    : 0;
  var liked = $.myLikes.current.has(String(c.id));
  // Cfr. la nota in CardItem: nessun "isOwner" per lo studente, perché le Rules non
  // gli permettono di riscrivere una card e il salvataggio falliva in silenzio.
  var cardLinks = normalizeLinks ? normalizeLinks(c) : [];
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
      onPointerDown={function (e: any) {
        // Chiude SOLO se il click PARTE dal backdrop: una selezione testo / drag
        // che inizia dentro la card e finisce sul backdrop non deve chiuderla
        // (il click si risolve sull'antenato comune, il backdrop).
        if (e.target === e.currentTarget) e.currentTarget.dataset.sbDismiss = '1';
        else delete e.currentTarget.dataset.sbDismiss;
      }}
      onClick={function (e: any) {
        if (e.currentTarget.dataset.sbDismiss !== '1') return;
        delete e.currentTarget.dataset.sbDismiss;
        $.closeCard();
      }}
    >
      <div
        ref={scrollRef}
        className="modal-inner"
        role="dialog"
        aria-modal="true"
        aria-label={'Dettaglio card: ' + (c.titolo || '')}
        style={{
          background: 'var(--sb-panel-grad)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid var(--sb-line)',
          borderRadius: '22px 22px 0 0',
          boxShadow: 'var(--sb-panel-shadow)',
          width: '100%',
          maxWidth: 760,
          maxHeight: '94vh',
          overflow: 'auto',
        }}
        onScroll={function () {
          var root = scrollRef.current;
          if (!root) return;
          var ids = ['cd-testo', 'cd-allegati', 'cd-interattivo', 'cd-commenti'];
          var current = activeSection;
          var top = root.scrollTop + 120;
          for (var i = 0; i < ids.length; i++) {
            var el = root.querySelector('#' + ids[i]);
            if (el && (el as any).offsetTop <= top) current = ids[i];
          }
          if (current !== activeSection) setActiveSection(current);
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
            background: 'var(--sb-handle-grad)',
          }}
        >
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--sb-line-strong)', marginTop: 6 }} />
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
              right: 12,
              top: 10,
              width: 38,
              height: 38,
              borderRadius: '50%',
              border: '1px solid var(--sb-line-strong)',
              background: 'var(--sb-btn-bg)',
              color: 'var(--sb-text-1)',
              fontSize: 17,
              fontWeight: 700,
              lineHeight: 1,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              // Target touch minimo consigliato (44px) per il cellulare
              boxSizing: 'content-box',
              padding: 3,
            }}
          >
            ✕
          </button>
        </div>

        {/* Cover image */}
        {c.copertina && (function () {
          var copertinaCaricata = copertinaLoadedSrc === c.copertina;
          return (
            <div
              className="card-detail-hero"
              style={{ width: '100%', background: 'var(--sb-hero-bg)', cursor: 'pointer', overflow: 'hidden', position: 'relative', maxHeight: 340 }}
              onClick={function (e: any) {
                e.stopPropagation();
                $.setLightbox({ url: c.copertina, didascalia: c.titolo });
              }}
            >
              {/* Riempie le bande del letterbox con l'immagine stessa sfocata:
                  una locandina verticale resta intera, senza il ritaglio alto/basso
                  che faceva objectFit 'cover'. */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: 'url("' + c.copertina + '")',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(20px) saturate(.8)',
                  transform: 'scale(1.1)',
                  opacity: 0.55,
                }}
              />
              <img
                src={c.copertina}
                alt=""
                loading="lazy"
                decoding="async"
                onLoad={function () {
                  setCopertinaLoadedSrc(c.copertina);
                }}
                onError={function () {
                  setCopertinaLoadedSrc(c.copertina);
                }}
                style={{
                  position: 'relative',
                  zIndex: 1, // sopra il riempimento sfocato, qualunque sia l'ordine del DOM
                  width: '100%',
                  aspectRatio: '16 / 9',
                  maxHeight: 340,
                  objectFit: 'contain',
                  display: 'block',
                  filter: copertinaCaricata ? 'saturate(1.03)' : 'blur(14px) saturate(.9)',
                  transform: copertinaCaricata ? 'scale(1)' : 'scale(1.05)',
                  opacity: copertinaCaricata ? 1 : 0.86,
                  transition: 'filter .4s ease, transform .4s ease, opacity .4s ease',
                }}
              />
              <div style={{ position: 'absolute', left: 16, bottom: 14, zIndex: 2, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: 'rgba(15,23,42,.72)', border: '1px solid rgba(255,255,255,.18)', color: '#fff', backdropFilter: 'blur(8px)', fontWeight: 800, fontSize: 12 }}>
                <span>{tema.icon}</span><span>{etichettaTipo(c.tipo)}</span>
              </div>
            </div>
          );
        })()}

        {/* Body */}
        <div className="card-detail-reading" style={{ padding: '22px 24px 18px' }}>
          {/* Type badge + classi */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
            <span
              style={{
                // chipBg, non color: il fondo pieno con etichetta bianca va
                // sotto AA per «nota» (#94a3b8 ≈2,5:1). chipBg è la variante
                // scura del tema, già usata da CardItem per lo stesso chip.
                background: tema.chipBg,
                color: '#fff',
                borderRadius: 9,
                padding: '5px 11px',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 0.6,
                boxShadow: '0 6px 16px ' + tema.glow,
                border: '1px solid rgba(255,255,255,.14)',
              }}
            >
              {tema.icon + ' ' + etichettaTipo(c.tipo)}
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
                  color: 'var(--c-danger, #f87171)',
                  padding: '2px 6px',
                }}
              >
                NASCOSTA
              </span>
            )}
          </div>

          {/* Title */}
          <h2
            className="card-detail-title"
            style={{
              margin: '0 0 10px',
              fontWeight: 900,
              fontSize: 28,
              color: 'var(--sb-text-1)',
              lineHeight: 1.18,
              letterSpacing: 0.02,
            }}
          >
            {c.titolo}
          </h2>

          {/* Autor */}
          <div style={{ fontSize: 12, color: testoSecondario(isLight), marginBottom: 14 }}>
            di <strong style={{ color: 'var(--sb-text-1)', fontWeight: 700 }}>{c.autore || 'Prof'}</strong> ·{' '}
            {$.timeAgo(c.data)}
          </div>
          <nav className="detail-nav" aria-label="Sezioni card">
            {c.testo ? <button type="button" className={activeSection === 'cd-testo' ? 'active' : ''} onClick={function(){ var r=scrollRef.current; var el=r && r.querySelector('#cd-testo'); if(el) scrollInVista(el); }}>Contenuto</button> : null}
            {c.allegati && c.allegati.length ? <button type="button" className={activeSection === 'cd-allegati' ? 'active' : ''} onClick={function(){ var r=scrollRef.current; var el=r && r.querySelector('#cd-allegati'); if(el) scrollInVista(el); }}>Allegati</button> : null}
            {(c.tipo === 'sondaggio' || c.tipo === 'quiz' || (c.quizDomande && c.quizDomande.length)) ? <button type="button" className={activeSection === 'cd-interattivo' ? 'active' : ''} onClick={function(){ var r=scrollRef.current; var el=r && r.querySelector('#cd-interattivo'); if(el) scrollInVista(el); }}>Attività</button> : null}
            <button type="button" className={activeSection === 'cd-commenti' ? 'active' : ''} onClick={function(){ var r=scrollRef.current; var el=r && r.querySelector('#cd-commenti'); if(el) scrollInVista(el); }}>Commenti</button>
          </nav>

          {/* Testo */}
          {c.testo && (
            <div
              id="cd-testo"
              className="card-detail-bodytext cd-section"
              style={{
                color: 'var(--sb-text-2)',
                marginBottom: 20,
                whiteSpace: 'pre-wrap',
              }}
            >
              {c.testo}
            </div>
          )}

          {/* Images gallery */}
          {c.immagini && c.immagini.length > 0 && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
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
                      loading="lazy"
                      decoding="async"
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
            <div id="cd-allegati" className="cd-section" style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'var(--sb-text-3)',
                  marginBottom: 8,
                  letterSpacing: 1.2,
                }}
              >
                📎 ALLEGATI
              </div>
              {c.allegati.map(function (al: any, i: any) {
                var nome = allegatoNome(al, i);
                // Contenuto: `al.url` c'è nelle card salvate prima (retrocompatibilità),
                // altrimenti arriva dalla sottocollezione (allegati-card-servizio).
                var url = al.url || (contenutiAllegati && contenutiAllegati[String(al.id)]);
                // Allowlist URL: le Firestore Rules non validano `allegati`, quindi
                // l'URL è il campo più economico da falsificare ("javascript:...").
                // Un protocollo non consentito non diventa un link cliccabile: la riga
                // resta visibile ma inerte, così il docente vede che l'allegato esiste.
                var urlSicuro = urlAllegatoSicuro(url);
                var stileFile = {
                  display: 'flex' as const,
                  alignItems: 'center' as const,
                  gap: 6,
                  padding: '6px 10px',
                  background: 'rgba(255,255,255,.04)',
                  borderRadius: 8,
                  marginBottom: 4,
                  color: urlSicuro ? '#60a5fa' : 'rgba(255,255,255,.35)',
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,.06)',
                };
                if (!url) {
                  // Riga senza contenuto: si mostra il nome invece di far sparire
                  // l'allegato (sparire sarebbe una bugia: il file esiste, non è
                  // leggibile adesso). Due casi distinti, perché non sono la stessa
                  // cosa: la query è ancora in volo (⏳, il contenuto arriverà),
                  // oppure è finita e quel documento non c'è (⚠️, non arriverà mai:
                  // una ⏳ eterna direbbe il contrario).
                  var letto = contenutiAllegati !== null;
                  return (
                    <div
                      key={i}
                      data-testid={letto ? 'allegato-non-disponibile' : 'allegato-in-caricamento'}
                      style={stileFile}
                      title={letto ? 'Contenuto del file non disponibile' : 'Contenuto in caricamento'}
                    >
                      {allegatoIcona(al)} {nome} {letto ? '⚠️' : '⏳'}
                    </div>
                  );
                }
                if (!urlSicuro) {
                  return (
                    <div key={i} data-testid="allegato-non-cliccabile" title="Allegato non apribile: link non sicuro">
                      {allegatoIcona(al)} {nome} 🔒
                    </div>
                  );
                }
                // HTML: nessun link verso la data URL (i browser bloccano la navigazione
                // top-level verso data:), quindi pulsante di anteprima sabbiata + download.
if (isHtmlAllegato(al)) {
                  // Già consegnato da questo studente: la riga resta visibile (il
                  // docente ha pubblicato quell'allegato, nasconderlo sarebbe una
                  // sorpresa) ma non si riapre. È il "non poterlo ripetere" che vale
                  // DENTRO l'app: fuori il file resta scaricabile e apribile, perché
                  // è un file e non c'è modo di metterlo sotto chiave.
                  if (giaCompletato(consegne, chiaveAllegato(c.id, i))) {
                    return (
                      <div
                        key={i}
                        data-testid="allegato-gia-completato"
                        title="Già completato: non si riapre"
                        style={Object.assign({}, stileFile, {
                          color: 'rgba(255,255,255,.38)',
                          borderColor: 'rgba(255,255,255,.05)',
                        })}
                      >
                        {allegatoIcona(al)} {nome} <span style={{ color: '#34d399' }}>✓ completato</span>
                      </div>
                    );
                  }
                  return (
                    <div key={i} data-testid="riga-allegato-html" style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={function () {
                          // Si passa una copia con l'url risolto: l'anteprima legge
                          // `al.url`, che nelle card nuove non è nel documento.
                          setHtmlPreview({ al: Object.assign({}, al, { url: url }), i: i });
                        }}
                        style={Object.assign({}, stileFile, {
                          flex: 1,
                          minWidth: 0,
                          cursor: 'pointer',
                          textAlign: 'left' as const,
                        })}
                      >
                        {allegatoIcona(al)} {nome}
                      </button>
                      <a href={url} download={nome} title="Scarica" aria-label={'Scarica ' + nome} style={stileFile}>
                        ⬇
                      </a>
                    </div>
                  );
                }
                return (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={stileFile}>
                    {allegatoIcona(al)} {nome}
                  </a>
                );
              })}
              {htmlPreview && (
                <AllegatoHtmlPreview
                  al={htmlPreview.al}
                  indice={htmlPreview.i}
                  onChiudi={function () {
                    setHtmlPreview(null);
                  }}
                  onCompletato={function () {
                    // L'allegato dichiara di essere finito. Lo registriamo per non
                    // riproporglielo: NON è un voto (vedi allegato-consegna.ts).
                    var u = $.user && $.user.uid;
                    if (!u) return;
                    var chiave = chiaveAllegato(c.id, htmlPreview.i);
                    registraConsegna(u, chiave);
                    // Aggiorna anche in memoria: senza, la riga resterebbe riapribile
                    // finché non si ricarica la pagina, e sembrerebbe che il
                    // "non ripeterlo" non funzioni.
                    setConsegne(function (precedente) {
                      return Object.assign({}, precedente, { [chiave]: new Date().toISOString() });
                    });
                  }}
                />
              )}
            </div>
          )}

          {/* Links */}
          {cardLinks.length > 0 && (
            <div className="cd-section" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--sb-text-3)', marginBottom: 8, letterSpacing: 1.2 }}>🔗 LINK</div>
              {cardLinks.map(function (link: any, i: any) {
                // Allowlist URL: senza questo, `javascript:` finiva in un href e il
                // click del docente eseguiva codice con la sua sessione aperta. Il
                // blocco 🔗 LINK della modale NON è gated su isProf e `links` non è
                // fra i campi vietati dalle rules: la proposta di uno studente porta
                // i link che vuole. Lo stesso controllo esiste già in app-utils.tsx
                // (normalizeLinks) per l'altro renderer dei link: qui mancava, quindi
                // due renderer dello stesso dato con regole diverse.
                if (!link.url || !sbSafeUrl(link.url)) return null;
                return (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'block',
                      color: '#60a5fa',
                      fontSize: 13,
                      marginBottom: 6,
                      wordBreak: 'break-all',
                      fontWeight: 600,
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
              var fmt = countdownStr(c.scadenza, cdNow);
              var expired = fmt.expired;
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
                    color: expired ? 'var(--c-danger, #f87171)' : 'var(--c-warn, #fbbf24)',
                    fontWeight: 700,
                    marginBottom: 12,
                  }}
                >
                  <span>{'⏰ ' + fmt.str}</span>
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
                        color: testoSecondario(isLight),
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

          <div id="cd-interattivo">
          {/* Sondaggio */}
          {c.tipo === 'sondaggio' && c.opzioni && (
            <div className="cd-section" style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'var(--sb-text-3)',
                  letterSpacing: 1.2,
                  marginBottom: 10,
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
                          background: hasVoted ? 'linear-gradient(90deg,var(--c-primary, #6366f1),#a855f7)' : 'var(--c-primary, #6366f1)',
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
                          background: 'rgba(var(--c-primary-rgb),.2)',
                          border: '1px solid rgba(var(--c-primary-rgb),.4)',
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
          </div>

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
                background: liked ? 'rgba(var(--c-primary-rgb),.3)' : 'rgba(255,255,255,.08)',
                border: '1px solid ' + (liked ? 'rgba(var(--c-primary-rgb),.5)' : 'rgba(255,255,255,.1)'),
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
                  color: 'var(--c-warn, #fbbf24)',
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
                    background: hasMe ? 'rgba(var(--c-primary-rgb),.25)' : 'rgba(255,255,255,.06)',
                    border: '1px solid ' + (hasMe ? 'rgba(var(--c-primary-rgb),.4)' : 'rgba(255,255,255,.1)'),
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
            {$.isProf && !$.simulaSt && (
              <button
                onClick={function (e: any) {
                  e.stopPropagation();
                  // chiediEliminazione, non delCardWithUndo diretto: è lui
                  // che distingue "cancella ovunque" da "togli da questa
                  // classe" quando il filtro classe è attivo.
                  $.chiediEliminazione(c.id);
                }}
                className="cd-pill"
                style={{
                  background: 'rgba(239,68,68,.15)',
                  border: '1px solid rgba(239,68,68,.3)',
                  color: 'var(--c-danger, #f87171)',
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
                background: 'rgba(var(--c-primary-rgb),.12)',
                border: '1px solid rgba(var(--c-primary-rgb),.3)',
                color: '#a5b4fc',
                marginBottom: 8,
              }}
            >
              🤖 Analizza sondaggio
            </button>
          )}
{$.isProf && c.tipo === 'sondaggio' && $.sondaggioAiResult[c.id] && (
            <div
              style={{
                background: 'rgba(var(--c-primary-rgb),.08)',
                border: '1px solid rgba(var(--c-primary-rgb),.2)',
                borderRadius: 8,
                padding: '8px 12px',
                marginBottom: 12,
                fontSize: 12,
              }}
            >
              {$.sondaggioAiResult[c.id]}
              {/* Output IA senza badge: la PrivacyModal promette che ogni contenuto
                  generato è contrassegnato (regola 3). */}
              <BadgeAi separatore={false} />
            </div>
          )}

          {/* Sezione domande libere AI — SOLO PROF (le chiamate AI costano e sono riservate al docente) */}
          <DomandeLiberePanel $={$} c={c} />
        </div>

        {/* Comments section */}
        <div id="cd-commenti"><CommentsSection $={$} c={c} /></div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={function () { if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: "smooth" }); }}>? Torna su</button>
        </div>

        {/* Rifiuta proposta modal */}
        <RifiutaModal $={$} c={c} />
      </div>
    </div>
  );
}
export default CardDetail__;
