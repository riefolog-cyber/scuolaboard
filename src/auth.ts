// auth.ts — hook di autenticazione (pattern globali UMD: React, firebase via window)

var SB = window.SB || {};
window.SB = SB;
var useState = React.useState;
var useEffect = React.useEffect;
SB.useAuth = function (annoScolastico: string) {
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
          });
      })
      .catch(function () {});
    var authTimeout = setTimeout(function () {
      setAuthLoad(false);
    }, 10000);
    var unsub = auth.onAuthStateChanged(function (fu: any) {
      clearTimeout(authTimeout);
      if (fu) {
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
    [annoScolastico]
  );
  async function loginGoogle() {
    if (!auth) {
      console.warn('[auth] Firebase auth not available; login aborted.');
      return;
    }
    try {
      var provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      var cr = await auth.signInWithPopup(provider);
      var fu = cr.user;
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
    auth.signOut();
    setUser(null);
    setIsProf(false);
  }
  return { user, isProf, loginGoogle, logout, authLoad };
};
