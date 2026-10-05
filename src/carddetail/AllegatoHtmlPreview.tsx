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

import { allegatoNome, htmlSrcDoc, urlAllegatoSicuro } from '../allegati.ts';

function AllegatoHtmlPreview({ al, indice, onChiudi }: any) {
  var nome = allegatoNome(al, indice);
  var scaricabile = urlAllegatoSicuro(al.url);
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
      </div>
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
          border: 'none',
          background: '#fff',
          display: 'block',
        }}
      />
    </div>
  );
}
export default AllegatoHtmlPreview;
