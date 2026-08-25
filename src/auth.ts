// auth.ts — hook di autenticazione (pattern globali UMD: React, firebase via window)

var SB = window.SB || {};
window.SB = SB;
var useState = React.useState;
var useEffect = React.useEffect;

// ── Filtro accesso: dominio scuola + whitelist docente ─────────────────────
// Minimizzazione dei dati (GDPR Art. 5): solo gli account istituzionali del
// dominio scuola e gli indirizzi esplicitamente autorizzati (docenti con
// account personale) possono usare l'app. Questo controllo client-side gestisce
// l'UX (sign-out immediato); il presidio di sicurezza reale è rispecchiato
// nelle Firestore Rules (helper isEmailAutorizzata).
var DOMINIO_SCUOLA = '@ferrarisfermiclass.it';
var DOCENTI_WHITELIST = ['riefolog@gmail.com'];

// Firma esplicita: script UMD — una function diventerebbe globale e TS6
// inferirebbe `() => void` (zero argomenti) → TS2554 sulle chiamate.
var isEmailAutorizzata = function (email: string | null | undefined): boolean {
  if (window.SB_DEBUG) console.log('[auth] filtro accesso, email dal token:', JSON.stringify(email));
  // Allineato al server (rules firestore.txt → emailUtente()): un'email assente
  // NON è autorizzata. Prima il client lasciava passare (return true) e poi il
  // server negava la lettura di users/{uid} con un confuso permission-denied
  // (riprodotto su localhost con account scuola). Con Google l'email c'è sempre.
  if (!email) return false;
  var em = String(email).toLowerCase().trim();
  if (em.endsWith(DOMINIO_SCUOLA.toLowerCase())) return true;
  return (
    DOCENTI_WHITELIST.filter(function (d: string) {
      return d.toLowerCase() === em;
    }).length > 0
  );
};

// Disconnessione immediata + messaggio chiaro per l'utente non autorizzato.
// Chiamata PRIMA di qualsiasi scrittura su Firestore: nessun profilo "fantasma"
// viene creato per account esterni al dominio.
function negaAccesso(authInst: any): void {
  try {
    if (authInst) authInst.signOut();
  } catch (e) {}
  window.alert(
    'Accesso non autorizzato.\n\nPuoi accedere solo con un account ' +
      DOMINIO_SCUOLA +
      ' oppure con un account docente autorizzato.'
  );
}

SB.useAuth = function (_annoScolastico: string) {
  // AuthUser | null: stato autenticato (merge doc users/{uid}) o non autenticato
  var [user, setUser] = useState<AuthUser | null>(null);
  var [authLoad, setAuthLoad] = useState(true);
  var [isProf, setIsProf] = useState(false);
  // Guard against missing Firebase auth
  var auth: any = null;
  if (typeof firebase === 'undefined' || typeof firebase.auth !== 'function') {
    console.error('[auth] Firebase Auth not available. App will start in offline mode.');
  } else {
    auth = firebase.auth();
  }// Tipo strutturale dell'utente: matcha l'interfaccia `User` (storica in
// types.ts, rimossa perché mai importata). Nessun import qui: auth.ts è uno
// script UMD — un import lo convertirebbe in module rompendo l'export globale
// SB.useAuth. I campi di Firestore sono opzionali: il merge con il doc users/{}
// li completa (nascono dai dati Google).
type AuthUser = {
  uid: string;
  nome?: string;
  cognome?: string;
  photoURL?: string | null;
  email?: string;
  role?: 'studente' | 'prof';
  classe?: string | null;
  classiPerAnno?: Record<string, string>;
  displayName?: string | null;
  [key: string]: any; // campi extra da Firestore (provider, ...)
};

var db = firebase.firestore();
SB.LS = SB.LS || {};
useEffect(
  function () {
    if (!auth) {
      setAuthLoad(false);
      return;
    }
    auth
      .getRedirectResult()
      .then(function (cr: any) {
        if (!cr || !cr.user) return;
        var fu = cr.user;
        // Filtro accesso: account fuori dominio/whitelist → sign-out immediato,
        // prima ancora di toccare Firestore.
        if (!isEmailAutorizzata(fu.email)) {
          negaAccesso(auth);
          return;
        }
        db.collection('users')
          .doc(fu.uid)
          .get()
          .then(function (ud: any) {
            if (!ud.exists) {
              var np = (fu.displayName || '').split(' ');
              db.collection('users')
                .doc(fu.uid)
                .set({
                  nome: np[0] || 'Utente',
                  cognome: np.slice(1).join(' ') || '',
                  // Persisto anche il displayName Google: è usato come chiave
                  // canonica per le Firestore Rules (quiz_risposte, ammonizioni)
                  // che confrontano resource.data.studente == request.auth.token.name.
                  displayName: fu.displayName || (np[0] + ' ' + (np.slice(1).join(' ') || '')).trim() || null,
                  role: 'studente',
                  provider: 'google',
                  classiPerAnno: {},
                });
            } else if (!ud.data().displayName && fu.displayName) {
              // Backfill: utenti esistenti senza displayName lo ricevono al primo login
              db.collection('users').doc(fu.uid).update({ displayName: fu.displayName });
            }
          })
          .catch(function (err: any) {
            console.error('[auth] getRedirectResult: lettura profilo users/{uid} fallita:', err && err.code, err && err.message);
          });
      })
      .catch(function (err: any) {
        console.error('[auth] getRedirectResult fallito:', err && err.code, err && err.message);
      });
    var authTimeout = setTimeout(function () {
      setAuthLoad(false);
    }, 10000);
    var unsub = auth.onAuthStateChanged(function (fu: any) {
      clearTimeout(authTimeout);
      if (fu) {
        // Filtro accesso su sessioni persistite (es. login via redirect
        // dell'accesso precedente): disconnessione immediata se non autorizzato.
        if (!isEmailAutorizzata(fu.email)) {
          negaAccesso(auth);
          setUser(null);
          setIsProf(false);
          setAuthLoad(false);
          return;
        }
        db.collection('users')
          .doc(fu.uid)
          .get()
          .then(function (doc: any) {
            var base = { uid: fu.uid, email: fu.email, displayName: fu.displayName, photoURL: fu.photoURL };
            if (doc.exists) {
              var d = doc.data();
              var finalUser = Object.assign({}, base, d) as AuthUser;
              setUser(finalUser);
              setIsProf(finalUser.role === 'prof');
            } else {
              setUser(null);
              setIsProf(false);
            }
            setAuthLoad(false);
          })
          .catch(function (err: any) {
            // Es. permission-denied (regole non pubblicate / token senza email):
            // non lasciare l'app sullo spinner 10s, mostra la login e logga.
            console.error('[auth] lettura profilo users/{uid} fallita:', err && err.code, err && err.message);
            setAuthLoad(false);
          });
      } else {
        setUser(null);
        setIsProf(false);
        setAuthLoad(false);
      }
    });
      return function () {
        if (typeof unsub === 'function') unsub();
        clearTimeout(authTimeout);
      };
    },
    []
  );
  async function loginGoogle() {
    if (!auth) {
      if (window.SB_DEBUG) console.warn('[auth] Firebase auth not available; login aborted.');
      return;
    }
    try {
      var provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      var cr = await auth.signInWithPopup(provider);
      var fu = cr.user;
      // Filtro accesso: nessun profilo viene creato per email non autorizzate.
      if (fu && !isEmailAutorizzata(fu.email)) {
        negaAccesso(auth);
        return;
      }
      if (!fu) return;
      var ud = await db.collection('users').doc(fu.uid).get();
      if (!ud.exists) {
        var np = (fu.displayName || '').split(' ');
        await db
          .collection('users')
          .doc(fu.uid)
          .set({
            nome: np[0] || 'Utente',
            cognome: np.slice(1).join(' ') || '',
            displayName: fu.displayName || (np[0] + ' ' + (np.slice(1).join(' ') || '')).trim() || null,
            role: 'studente',
            provider: 'google',
            classiPerAnno: {},
          });
      } else {
        // Backfill displayName su utenti esistenti che ancora non lo hanno
        var existing = ud.data();
        if (!existing.displayName && fu.displayName) {
          await db.collection('users').doc(fu.uid).update({ displayName: fu.displayName });
        }
      }
    } catch (e: any) {
      if (e.code === 'auth/popup-blocked') {
        try {
          await auth.signInWithRedirect(new firebase.auth.GoogleAuthProvider());
        } catch (e2) {}
      }
    }
  }
  function logout() {
    // Il sign-out deve essere infallibile: anche se Firebase non è disponibile
    // o signOut() lancia, lo stato utente va comunque azzerato (login screen).
    // Prima del fix una signOut() che falliva bloccava l'esecuzione e il tasto
    // "Esci" non faceva nulla (segnalato sul sito pubblicato con shell PWA stale).
    try {
      if (auth && typeof auth.signOut === 'function') auth.signOut();
    } catch (e) {}
    setUser(null);
    setIsProf(false);
  }
  return { user, isProf, loginGoogle, logout, authLoad };
};
