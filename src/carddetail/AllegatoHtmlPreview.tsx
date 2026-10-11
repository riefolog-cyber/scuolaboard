// AllegatoHtmlPreview.tsx · ScuolaBoard · anteprima degli allegati .html/.htm
//
// Sicurezza: la preview è un iframe SABBIATO. `allow-scripts` senza
// `allow-same-origin` è la configurazione standard per mostrare HTML non fidato:
// l'origine è opaca, quindi il file NON può leggere il DOM dell'app, i cookie,
// localStorage, IndexedDB né il token Firebase della sessione, non può navigare
// la pagina sopra e non può aprire popup. Non aggiungere mai `allow-same-origin`
// (che gli darebbe la nostra origine: stored XSS vero) né `allow-top-navigation`.
//
// allow-scripts è necessario perché i file che si allegano di solito sono
// applicazioni web, non pagine statiche: il quiz di esempio ha TUTTE le domande in
// `.question{display:none}` e le mostra solo con una funzione `init()` che aggiunge
// `.active`. Con la sandbox a zero permessi l'allegato si apriva e restava VUOTO —
// verificato con il file reale su Chrome e WebKit: 0 domande visibili su entrambi.
// Perché è accettabile: `allegati` è vietato allo studente nelle Firestore Rules e il
// pannello di caricamento è solo del docente, quindi il file lo ha scritto il
// prof stesso. Resta il limite: il file può fare richieste di rete (caricare
// risorse esterne, e in teoria tracciare chi apre) e mostrare grafica a piacere
// dentro il riquadro di anteprima.
//
// Il contenuto arriva in `srcDoc` e non in `src`: niente Blob URL da revocare e
// nessun `data:` URL navigabile. Il download è l'unico modo per portare il file
// fuori dal sandbox.
//
// ── Schermo intero e "non uscire prima della fine" ────────────────────────
// Il docente chiedeva che l'allegato si aprisse a schermo intero e che da lì non
// si potesse uscire prima di aver finito. Sono due richieste che hanno limiti
// DIVERSI, ed è importante dirli perché la differenza è fra comodità e sicurezza:
//
//  · lo SCHERMO INTERO è un OVERLAY NOSTRO, non il fullscreen del browser. Motivo:
//    con `requestFullscreen()` ESC esce sempre (è il tasto che il browser si
//    riserva, nessuna API lo trattiene) e la funzione non esiste su iPhone
//    Safari. L'overlay copre la pagina e funziona su ogni motore;
//  · NON USCIRE NON È UN VINCOLO. ESC chiede una conferma finché il quiz non è
//    consegnato: si esce per decisione, non premendo un tasto per errore. Sopra
//    l'overlay restano la X del browser, il tasto indietro del telefono, il
//    ricaricamento dal menu e la chiusura della scheda: li gestisce il browser e
//    non c'è modo di intercettarli. Promettere "non si può uscire" sarebbe falso;
//  · «non ripeterlo» vale dentro l'app: si registra che lo studente ha finito e
//    non glielo riproponiamo. Fuori dall'app il file resta scaricabile: è un file.
//
// La consegna la segnala il FILE con `postMessage({sb:'allegato-completato'})`,
// l'unico canale che ha a disposizione: è a origine opaca, quindi non può
// scrivere su Firestore né essere autenticato (uno studente può inviare quel
// messaggio a mano). Per questo la registrazione è "lo studente dice di aver
// finito" e NON un voto: serve solo a non riproporgli l'allegato.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { allegatoNome, htmlSrcDoc, urlAllegatoSicuro } from '../allegati.ts';
import { isMessaggioAllegatoCompletato } from '../allegato-consegna.ts';

function AllegatoHtmlPreview({ al, indice, onChiudi, onCompletato }: any) {
  var nome = allegatoNome(al, indice);
  var scaricabile = urlAllegatoSicuro(al.url);
  var [pienoSchermo, setPienoSchermo] = useState(false);
  var [completato, setCompletato] = useState(false);
  var [chiediConferma, setChiediConferma] = useState(false);

  // Il file consegna il quiz con un postMessage. Non è autenticabile (origine
  // opaca) ma è l'unico modo che ha di dirlo, e serve a una cosa sola: sapere
  // che non gli riproponiamo l'allegato.
  useEffect(function () {
    function suMessaggio(e: any) {
      if (!isMessaggioAllegatoCompletato(e && e.data)) return;
      setCompletato(true);
      if (onCompletato) onCompletato();
    }
    window.addEventListener('message', suMessaggio);
    return function () {
      window.removeEventListener('message', suMessaggio);
    };
  }, [onCompletato]);

  // ── ESC ────────────────────────────────────────────────────────────────
  // Prima usavamo `requestFullscreen()`, che è sbagliato per due motivi:
  //
  //  1. su iPhone Safari NON ESISTE: il pulsante non faceva nulla, in
  //     silenzio, proprio sugli studenti che lo useranno di più;
  //  2. ESC esce SEMPRE dal fullscreen del browser e nessuna API lo impedisce.
  //
  // Con l'overlay nostro ESC è un tasto come un altro, quindi lo intercettiamo.
  //
  // NON lo blocchiamo secco: se il file è rotto e non consegna mai, lo studente
  // resterebbe intrappolato in una pagina da cui non può uscire. ESC chiede una
  // conferma: esce chi vuole uscire, ma non per errore con un dito. È la
  // differenza fra «non esce per caso» e «non può uscire», e la seconda è una
  // gabbia, non un quiz.
  useEffect(function () {
    function suTasto(e: any) {
      if (e.key !== 'Escape') return;
      if (!pienoSchermo) return;
      // FASE DI CATTURA (`true`): gira PRIMA di tutti gli ascoltatori in
      // bubbling. Serve davvero, non per robustezza: `AppProvider` ha un
      // gestore ESC globale che chiude la card, registrato al mount quindi
      // prima del nostro, e in bubbling chiudeva l'intera anteprima senza
      // passare dalla conferma — cioè ESC usciva comunque, che era
      // esattamente il difetto da eliminare. Qui l'overlay incrocia il
      // tasto, lo trattiene e ferma gli altri ascoltatori.
      e.preventDefault();
      e.stopImmediatePropagation();
      if (completato) esci();
      else setChiediConferma(true);
    }
    document.addEventListener('keydown', suTasto, true);
    return function () {
      document.removeEventListener('keydown', suTasto, true);
    };
  }, [pienoSchermo, completato]);

  function esci() {
    setPienoSchermo(false);
    setChiediConferma(false);
    onChiudi();
  }

  // Il contenuto è identico in anteprima e a schermo intero: cambia solo il
  // contenitore che lo ospita.
  var contenuto = (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          borderBottom: '1px solid rgba(255,255,255,.08)',
          flexShrink: 0,
          background: '#161a28',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#f1f5f9',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            🌐 {nome}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)' }}>
            Isolato in una sandbox: il file non può leggere i dati dell'app né la tua sessione.
          </div>
        </div>
        {scaricabile ? (
          <a
            href={al.url}
            download={nome}
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#60a5fa',
              textDecoration: 'none',
              padding: '4px 8px',
              border: '1px solid rgba(96,165,250,.35)',
              borderRadius: 7,
              whiteSpace: 'nowrap',
            }}
          >
            ⬇ Scarica
          </a>
        ) : (
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', whiteSpace: 'nowrap' }}>
            🔒 non scaricabile
          </span>
        )}
        <button
          aria-label={pienoSchermo ? 'Esci da schermo intero' : 'Apri a schermo intero'}
          title={pienoSchermo ? 'Esci da schermo intero' : 'Apri a schermo intero'}
          onClick={function () {
            if (pienoSchermo) {
              // Stessa regola di ESC: se il quiz non è finito, non si esce
              // con un tocco. Il pulsante è lì, ma passa dalla conferma.
              if (completato) esci();
              else setChiediConferma(true);
            } else {
              setPienoSchermo(true);
            }
          }}
          style={{
            background: pienoSchermo ? 'rgba(96,165,250,.22)' : 'rgba(255,255,255,.06)',
            color: pienoSchermo ? '#93c5fd' : 'rgba(255,255,255,.6)',
            border: '1px solid rgba(96,165,250,.35)',
            borderRadius: 7,
            width: 26,
            height: 26,
            cursor: 'pointer',
            fontSize: 12,
            flexShrink: 0,
          }}
        >
          {pienoSchermo ? '⤡' : '⛶'}
        </button>
        {pienoSchermo ? null : (
          <button
            aria-label="Chiudi anteprima"
            onClick={function () {
              onChiudi();
            }}
            style={{
              background: 'rgba(255,255,255,.06)',
              color: 'rgba(255,255,255,.6)',
              border: 'none',
              borderRadius: 7,
              width: 24,
              height: 24,
              cursor: 'pointer',
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        )}
      </div>

      {pienoSchermo ? (
        <div
          data-testid="anteprima-fullscreen-avviso"
          style={{
            padding: '7px 12px',
            fontSize: 11.5,
            color: '#fcd34d',
            background: 'rgba(245,158,11,.12)',
            borderBottom: '1px solid rgba(245,158,11,.28)',
            lineHeight: 1.5,
            flexShrink: 0,
          }}
        >
          {completato
            ? 'Quiz consegnato. Puoi tornare alla bacheca quando vuoi, con il tasto Esc o con il pulsante in alto a destra.'
            : 'A schermo intero. Esc chiederà conferma prima di farti uscire, finché il quiz non è consegnato.'}
        </div>
      ) : null}

      <iframe
        title={'Anteprima di ' + nome}
        // allow-scripts serve (i file allegati sono app web: senza script restano
        // vuoti). NON aggiungere allow-same-origin: darebbe al file la nostra origine
        // e con il DOM dell'app, la sessione Firebase di chi guarda. Vedi l'intestazione.
        sandbox="allow-scripts"
        srcDoc={htmlSrcDoc(al)}
        referrerPolicy="no-referrer"
        // Altezza maggiorata e proporzionale: i file allegati sono pagine lunghe
        // (il quiz di esempio ha 12 domande) e 320px fissi rendevano l'anteprima
        // inutilizzabile su telefono, costringendo a scorrere dentro un riquadro
        // strettissimo. 62vh con min/max: comodo su desktop, leggibile su mobile.
        style={{
          width: '100%',
          height: '62vh',
          minHeight: 360,
          maxHeight: 620,
          // Nell'overlay l'iframe prende tutto lo spazio che resta sotto la
          // barra: con l'altezza fissa sopra resterebbe una striscia in cima a
          // una pagina nera, cioè sembrerebbe un caricamento rotto.
          ...(pienoSchermo ? { height: 'auto', flex: '1 1 auto', minHeight: 0, maxHeight: 'none' } : {}),
          border: 'none',
          background: '#fff',
          display: 'block',
        }}
      />

      {chiediConferma ? (
        <div
          data-testid="anteprima-conferma-uscita"
          role="dialog"
          aria-label="Conferma uscita"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2147483100,
            background: 'rgba(6,8,15,.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#161a28',
              border: '1px solid rgba(255,255,255,.14)',
              borderRadius: 14,
              padding: '22px 22px 18px',
              maxWidth: 380,
              boxShadow: '0 24px 60px -20px rgba(0,0,0,.75)',
            }}
          >
            <div style={{ fontSize: 15.5, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>
              Uscire senza consegnare?
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', lineHeight: 1.6, marginBottom: 18 }}>
              L'allegato non ha comunicato la fine del quiz. Se esci ora, non lo vedrai più in questa card.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={function () {
                  setChiediConferma(false);
                }}
                style={{
                  font: 'inherit',
                  fontSize: 13,
                  padding: '9px 15px',
                  borderRadius: 9,
                  border: '1px solid rgba(255,255,255,.16)',
                  background: 'transparent',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                }}
              >
                Resta nel quiz
              </button>
              <button
                onClick={function () {
                  esci();
                }}
                style={{
                  font: 'inherit',
                  fontSize: 13,
                  fontWeight: 650,
                  padding: '9px 15px',
                  borderRadius: 9,
                  border: 'none',
                  background: '#f87171',
                  color: '#1a0b0b',
                  cursor: 'pointer',
                }}
              >
                Esci comunque
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );

  // ── Schermo intero: montato con un PORTAL su document.body ───────────────
  // Non basta `position: fixed` qui dentro: questa preview vive dentro la
  // modale della card, e `.modal-inner` ha `max-width: 560px` più una
  // `animation: slideup` che muove `transform`. Un antenato con `transform`
  // (anche quello di un'animazione) diventa il riferimento di `position: fixed`
  // dei suoi figli: l'overlay restava largo quanto la modale e sembrava una
  // anteprima da cellulare, nonostante `inset: 0`.
  //
  // Il portal monta l'overlay direttamente su `document.body`, fuori da quella
  // catena: copre davvero tutta la finestra, su un portatile quanto schermo.
  if (pienoSchermo && typeof document !== 'undefined') {
    return createPortal(
      <div
        data-testid="anteprima-html"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2147483000,
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {contenuto}
      </div>,
      document.body
    );
  }

  return (
    <div
      data-testid="anteprima-html"
      style={{
        marginTop: 8,
        marginBottom: 10,
        border: '1px solid rgba(96,165,250,.35)',
        borderRadius: 12,
        overflow: 'hidden',
        background: 'rgba(255,255,255,.03)',
      }}
    >
      {contenuto}
    </div>
  );
}
export default AllegatoHtmlPreview;