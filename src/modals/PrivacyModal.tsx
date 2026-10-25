// PrivacyModal.tsx  ·  estratto da Modals.tsx (split Fase 2a)
// Esteso: mostra procedura privacy completa quando showPrivacyInfo è attivo
import { salvaConsenso } from '../consensi-servizio.ts';

var SB = window.SB || {};

function PrivacyModal(props: any) {
  var isLight = !!props.isLight;
  var isInfo = props.showPrivacyInfo;
  var isOpen = props.showPrivacy || isInfo;

  if (!isOpen) return null;

  // Stili theme-aware
  var overlayBg = isLight ? 'rgba(15,23,42,.45)' : 'rgba(0,0,0,.92)';
  var cardBg = isLight ? '#ffffff' : '#1c1a2e';
  var cardBorder = isLight ? '1px solid rgba(15,23,42,.10)' : '1px solid rgba(var(--c-primary-rgb),.3)';
  var cardShadow = isLight ? '0 20px 60px rgba(15,23,42,.15)' : 'none';
  var titleColor = isLight ? '#0f172a' : '#f1f5f9';
  var subColor = isLight ? '#64748b' : 'rgba(255,255,255,.45)';
  var infoBg = isLight ? '#f8fafc' : 'rgba(255,255,255,.04)';
  var infoBorder = isLight ? '1px solid rgba(15,23,42,.08)' : '1px solid rgba(255,255,255,.08)';
  var infoTextColor = isLight ? '#334155' : 'rgba(255,255,255,.7)';
  var stepTitleColor = isLight ? '#4338ca' : '#c7d2fe';
  var notaBg = isLight ? 'rgba(79,70,229,.06)' : 'rgba(var(--c-primary-rgb),.08)';
  var notaBorder = isLight ? '1px solid rgba(79,70,229,.12)' : '1px solid rgba(var(--c-primary-rgb),.15)';
  var notaColor = isLight ? '#475569' : 'rgba(255,255,255,.45)';

  // Modal "Prima di iniziare" — prima accettazione
  if (!isInfo) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: overlayBg,
          backdropFilter: 'blur(6px)',
          zIndex: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        {
          <div
            style={{
              background: cardBg,
              border: cardBorder,
              borderRadius: 20,
              padding: 28,
              maxWidth: 440,
              width: '100%',
              boxShadow: cardShadow,
            }}
            onClick={function (e: any) {
              e.stopPropagation();
            }}
          >
            {
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                {<div style={{ fontSize: 44, marginBottom: 8 }}>🔒</div>}
                {
                  <div style={{ fontWeight: 900, color: titleColor, fontSize: 18, marginBottom: 4 }}>
                    Prima di iniziare
                  </div>
                }
                {
                  <div style={{ fontSize: 12, color: subColor, lineHeight: 1.6 }}>
                    Questa bacheca è uno strumento didattico del tuo insegnante.
                  </div>
                }
              </div>
            }
            {
              <button
                onClick={function () {
                  try {
                    if (props.user && props.user.uid) SB.LS.privacy.set(props.user.uid);
                  } catch (e) {}
                  // L'accettazione non resta solo in questo browser: la prova
                  // durevole va in consensi/{uid} (vedi consensi-servizio.ts).
                  // Non si aspettano né si bloccano le UI: se Firestore rifiuta,
                  // la modale si chiude lo stesso e la prova tenterà di nuovo al
                  // prossimo avvio.
                  if (props.user && props.user.uid) salvaConsenso(props.user.uid).catch(function () {});
                  props.setShowPrivacy(false);
                }}
                style={{
                  width: '100%',
                  padding: 13,
                  background: 'linear-gradient(135deg,var(--c-primary, #6366f1),#8b5cf6)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                ✓ Ho capito, accetto
              </button>
            }
          </div>
        }
      </div>
    );
  }

  // Modal informativa privacy — spiegazione procedura AI
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: overlayBg,
        backdropFilter: 'blur(6px)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={function () {
        props.setShowPrivacyInfo(false);
      }}
    >
      <div
        style={{
          background: cardBg,
          border: cardBorder,
          borderRadius: 20,
          padding: '28px 24px',
          maxWidth: 520,
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: cardShadow,
        }}
        onClick={function (e: any) {
          e.stopPropagation();
        }}
      >
        {/* Titolo */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🛡️</div>
          <div style={{ fontWeight: 900, color: titleColor, fontSize: 18, marginBottom: 4 }}>
            La tua privacy è protetta
          </div>
          <div style={{ fontSize: 12, color: subColor }}>Come ScuolaBoard tutela i dati dei studenti</div>
        </div>

        {/* Step 1 */}
        <div style={{ ...infoCardStyle, background: infoBg, border: infoBorder }}>
          <div style={infoStepStyle}>
            <span
              style={{
                background: 'var(--c-primary, #6366f1)',
                color: '#fff',
                borderRadius: 8,
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              1
            </span>
            <span style={{ fontWeight: 700, color: stepTitleColor }}>Anonimizzazione automatica</span>
          </div>
          <p style={{ ...infoTextStyle, color: infoTextColor }}>
            Prima di inviare i contenuti all'IA, i nomi degli studenti vengono automaticamente sostituiti con
            identificativi fittizi (Studente 1, Studente 2…); anche email, codici fiscali, IBAN e numeri di telefono
            diventano segnaposto. L'IA esterna non sa mai chi ha scritto cosa.
          </p>
        </div>

        {/* Step 2 */}
        <div style={{ ...infoCardStyle, background: infoBg, border: infoBorder }}>
          <div style={infoStepStyle}>
            <span
              style={{
                background: '#8b5cf6',
                color: '#fff',
                borderRadius: 8,
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              2
            </span>
            <span style={{ fontWeight: 700, color: stepTitleColor }}>Trasparenza totale</span>
          </div>
          <p style={{ ...infoTextStyle, color: infoTextColor }}>
            Ogni contenuto generato dall'IA è contrassegnato dal badge "Supporto IA – revisionato dal docente". Saprai
            sempre quando un contenuto è stato prodotto con supporto artificiale.
          </p>
        </div>

        {/* Step 3 */}
        <div style={{ ...infoCardStyle, background: infoBg, border: infoBorder }}>
          <div style={infoStepStyle}>
            <span
              style={{
                background: '#a855f7',
                color: '#fff',
                borderRadius: 8,
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              3
            </span>
            <span style={{ fontWeight: 700, color: stepTitleColor }}>Controllo umano</span>
          </div>
          <p style={{ ...infoTextStyle, color: infoTextColor }}>
            Nessuna valutazione è mai automatica. I quiz generati dall'IA sono sempre bozze che il docente revisiona
            prima di pubblicare. L'IA supporta, il docente decide.
          </p>
        </div>

        {/* Step 4 */}
        <div style={{ ...infoCardStyle, background: infoBg, border: infoBorder }}>
          <div style={infoStepStyle}>
            <span
              style={{
                background: '#ec4899',
                color: '#fff',
                borderRadius: 8,
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              4
            </span>
            <span style={{ fontWeight: 700, color: stepTitleColor }}>Dati mai esposti</span>
          </div>
          <p style={{ ...infoTextStyle, color: infoTextColor }}>
            Le credenziali dei modelli IA non sono mai nel browser: le chiamate passano da un proxy
            sicuro che le custodisce e che verifica che chi chiama sia un docente. Nel browser
            non ci sono i dati del modello, ma solo l'identificatore pubblico del progetto
            Firebase, che da solo non permette di leggere o scrivere dati senza le regole del
            database.
          </p>
        </div>

        {/* Informativa essenziale — art. 13 GDPR.
            I dati elencati sono quelli che l'app tratta davvero (verificabili nel
            codice): un elenco generico sarebbe una promessa che non si può
            mantenere. Per gli estremi del Titolare si rimanda all'Informativa
            d'Istituto, che è il documento ufficiale. */}
        <div style={{ ...infoCardStyle, background: infoBg, border: infoBorder }}>
          <div style={infoStepStyle}>
            <span
              style={{
                background: '#0ea5e9',
                color: '#fff',
                borderRadius: 8,
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              i
            </span>
            <span style={{ fontWeight: 700, color: stepTitleColor }}>Informativa essenziale (art. 13 GDPR)</span>
          </div>
          {INFORMATIVA.map(function (riga: any) {
            return (
              <p key={riga.titolo} style={{ ...infoTextStyle, color: infoTextColor, marginBottom: 8 }}>
                <strong style={{ color: stepTitleColor }}>{riga.titolo}: </strong>
                {riga.testo}
              </p>
            );
          })}
        </div>

        {/* Nota legale */}
        <div
          style={{
            marginTop: 16,
            padding: '10px 14px',
            background: notaBg,
            border: notaBorder,
            borderRadius: 10,
            fontSize: 11,
            color: notaColor,
            lineHeight: 1.5,
          }}
        >
          Conforme al Regolamento IA d'Istituto, AI Act (Art. 50) e GDPR (Art. 4 par. 5). Per maggiori dettagli,
          consulta l'InformativaPrivacy d'Istituto.
        </div>

        {/* Pulsante chiudi */}
        <button
          onClick={function () {
            props.setShowPrivacyInfo(false);
          }}
          style={{
            width: '100%',
            marginTop: 16,
            padding: 12,
            background: 'linear-gradient(135deg,var(--c-primary, #6366f1),#8b5cf6)',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ✕ Chiudi
        </button>
      </div>
    </div>
  );
}

// Informativa essenziale — art. 13 GDPR. Volutamente breve: si legge sul
// telefono, e un'informativa che nessuno scorre non informa. Ogni voce descrive
// ciò che l'app fa davvero; le garanzie e gli estremi che qui non possono stare
// (indirizzo del Titolare, recapiti del DPO, garanzie sui trasferimenti) sono
// nell'Informativa d'Istituto, che resta il documento ufficiale.
var INFORMATIVA = [
  {
    titolo: 'Titolare',
    testo: `l'Istituto scolastico. I recapiti e il Responsabile della protezione dei dati (DPO) sono quelli dell'Informativa d'Istituto, di cui questa scheda è una sintesi.`,
  },
  {
    titolo: 'Dati trattati',
    testo: `nome e email dell'account Google istituzionale, classe, card e commenti, risposte ai quiz con il punteggio, ammonizioni e quali card sono già state viste. Non si chiedono dati sanitari né giudiziari.`,
  },
  {
    titolo: 'Finalità e base giuridica',
    testo: `svolgimento dell'attività didattica (art. 6.1.e GDPR, compito di interesse pubblico dell'Istituto). Le funzioni di supporto IA non assegnano voti: ogni contenuto è rivisto dal docente.`,
  },
  {
    titolo: 'Destinatari',
    testo: `Google Firebase (database e hosting), Cloudflare (proxy delle chiamate IA) e Groq (modello linguistico). All'IA arrivano solo testi pseudonimizzati: nomi, email, codici fiscali, IBAN e telefoni diventano segnaposto prima dell'invio.`,
  },
  {
    titolo: "Trasferimenti fuori dall'UE",
    testo: `possibili per i fornitori elencati sopra; le garanzie applicate (clausole contrattuali standard e accordi sul trattamento) sono descritte nell'Informativa d'Istituto.`,
  },
  {
    titolo: 'Conservazione',
    testo: `i contenuti restano per l'anno scolastico e negli anni successivi come archivio storico della classe, finché non ne viene chiesta la cancellazione.`,
  },
  {
    titolo: 'Diritti',
    testo: `accesso, rettifica, cancellazione, limitazione, opposizione e portabilità (artt. 15-21 GDPR). Ci si rivolge al Titolare o al DPO dell'Istituto e, se non si ottiene risposta, al Garante per la protezione dei dati personali.`,
  },
];

// Stili condivisi per le card informative
var infoCardStyle: any = {
  background: 'rgba(255,255,255,.04)',
  border: '1px solid rgba(255,255,255,.08)',
  borderRadius: 12,
  padding: '12px 14px',
  marginBottom: 10,
};
var infoStepStyle: any = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 6,
};
var infoTextStyle: any = {
  fontSize: 12,
  color: 'rgba(255,255,255,.7)',
  lineHeight: 1.6,
  margin: 0,
};

export default PrivacyModal;
