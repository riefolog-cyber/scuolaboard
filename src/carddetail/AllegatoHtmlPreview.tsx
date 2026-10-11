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
//  · lo SCHERMO INTERO si ottiene e regge: si chiama `requestFullscreen()` sul
//    contenitore che AVVOLGE l'iframe, dall'esterno. Non serve toccare la sandbox
//    e non si aggiunge `allowfullscreen`: l'invito è del genitore, non del file.
//  · NON USCIRE non è garantibile. ESC esce dal fullscreen, si chiude la scheda,
//    si prega il browser, si torna indietro. Nessuna app web può impedirlo. Qui
//    si nasconde il pulsante «×» e si avvisa: è comfort, non un vincolo.
//  · «non ripeterlo» vale solo DENTRO l'app: si registra che quello studente ha
//    completato l'allegato e non glielo riproponiamo. Fuori dall'app il file resta
//    scaricabile e apribile: è un file, non c'è modo di metterlo sottochiave.
//
// La consegna la segnala il FILE con `postMessage({sb:'allegato-completato'})`,
// l'unico canale che ha a disposizione: è a origine opaca, quindi non può
// scrivere su Firestore né essere autenticato (un allievo può inviare quel
// messaggio a mano). Per questo la registrazione è "lo studente dice di aver
// finito" e NON un voto: serve solo a non riproporgli l'allegato.

import { useEffect, useRef, useState } from 'react';
import { allegatoNome, htmlSrcDoc, urlAllegatoSicuro } from '../allegati.ts';
import { isMessaggioAllegatoCompletato } from '../allegato-consegna.ts';

function AllegatoHtmlPreview({ al, indice, onChiudi, onCompletato }: any) {
  var nome = allegatoNome(al, indice);
  var scaricabile = urlAllegatoSicuro(al.url);
  var scatola = useRef<any>(null);
  var [pienoSchermo, setPienoSchermo] = useState(false);

  // Il file consegna il quiz con un postMessage. Non è autenticabile (origine
  // opaca) ma è l'unico modo che ha di dirlo, e serve a una cosa sola: sapere
  // che non gli riproponiamo l'allegato.
  useEffect(function () {
    function suMessaggio(e: any) {
      if (!isMessaggioAllegatoCompletato(e && e.data)) return;
      if (onCompletato) onCompletato();
    }
    window.addEventListener('message', suMessaggio);
    return function () {
      window.removeEventListener('message', suMessaggio);
    };
  }, [onCompletato]);

  function entraPienoSchermo() {
    var el = scatola.current;
    if (!el) return;
    try {
      var p = el.requestFullscreen ? el.requestFullscreen() : null;
      // Safari su iPhone non ha requestFullscreen sugli elementi: il fallback
      // qui non è lo stesso effetto, ma il pulsante non deve morire in silenzio.
      if (p && typeof p.catch === 'function')
        p.catch(function () {
          /* il browser ha rifiutato (per permessi o gesture): resta l'anteprima normale */
        });
    } catch (e) {
      /* idem: nessun.fullscreen in questo motore */
    }
  }

  function esciDaSchermoIntero() {
    try {
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
    } catch (e) {}
  }

  // ESC e il gesto del browser possono uscire dal fullscreen senza passare dai
  // nostri pulsanti: senza questo ascolto la barra resterebbe "a schermo intero"
  // mentre non lo è più.
  useEffect(function () {
    function suCambio() {
      setPienoSchermo(document.fullscreenElement === scatola.current);
    }
    document.addEventListener('fullscreenchange', suCambio);
    return function () {
      document.removeEventListener('fullscreenchange', suCambio);
    };
  }, []);

  return (
    <div
      ref={scatola}
      data-testid="anteprima-html"
      style={{
        marginTop: 8,
        marginBottom: 10,
        border: '1px solid rgba(96,165,250,.35)',
        borderRadius: 12,
        overflow: 'hidden',
        background: 'rgba(255,255,255,.03)',
        // A schermo intero il riquadro deve POTER crescere: con l'altezza fissa
        // (62vh sotto) il file resterebbe in una striscia in cima a uno schermo
        // nero, cioè sembrerebbe rotto invece che a tutto schermo.
        ...(pienoSchermo ? { height: '100vh', maxHeight: 'none', margin: 0, borderRadius: 0, border: 'none' } : {}),
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          borderBottom: '1px solid rgba(255,255,255,.08)',
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
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', whiteSpace: 'nowrap' }}>🔒 non scaricabile</span>
        )}
        <button
          aria-label={pienoSchermo ? 'Esci da schermo intero' : 'Apri a schermo intero'}
          title={pienoSchermo ? 'Esci da schermo intero (Esc)' : 'Apri a schermo intero'}
          onClick={function () {
            if (pienoSchermo) esciDaSchermoIntero();
            else entraPienoSchermo();
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
          }}
        >
          A schermo intero. Per tornare alla bacheca usa il pulsante ⤡ in alto a destra, o il tasto Esc.
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
          // A schermo intero l'iframe prende tutta l'altezza disponibile: con
          // l'altezza fissa sopra resterebbe una striscia in cima a una pagina
          // nera, cioè sembrerebbe un caricamento rotto invece che "a tutto schermo".
          ...(pienoSchermo ? { height: 'calc(100vh - 92px)', minHeight: 0, maxHeight: 'none' } : {}),
          border: 'none',
          background: '#fff',
          display: 'block',
        }}
      />
    </div>
  );
}
export default AllegatoHtmlPreview;
