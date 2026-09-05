// auth.ts — hook di autenticazione (pattern globali UMD: React, firebase via window)

import { useState, useEffect } from 'react';

// ── Filtro accesso: dominio scuola + whitelist docente ─────────────────────
// Minimizzazione dei dati (GDPR Art. 5): solo gli account istituzionali del
// dominio scuola e gli indirizzi esplicitamente autorizzati (docenti con
// account personale) possono usare l'app. Questo controllo client-side gestisce
// l'UX (sign-out immediato); il presidio di sicurezza reale è rispecchiato
// nelle Firestore Rules (helper isEmailAutorizzata).
var DOMINIO_SCUOLA = '@ferrarisfermiclass.it';
var DOCENTI_WHITELIST = ['riefolog@gmail.com'];

// Messaggio visibile sulla login quando il profilo non si riesce a caricare
// (Firestore irraggiungibile / permessi): l'utente deve capire che NON è un
// problema di credenziali e cosa fare (rete + ricarica).
var MSG_DB_DOWN =
  'Impossibile caricare il tuo profilo: database non raggiungibile. ' +
  'Controlla la connessione e ricarica la pagina.';

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

// Costruisce il documento profilo iniziale per un nuovo utente Google.
// Estratto in helper condiviso: prima la stessa logica era duplicata in
// getRedirectResult e loginGoogle (rischio divergenza), e loadProfilo non la
// usava affatto (se il doc mancava dopo i retry l'utente restava "fantasma"
// sulla login fino al refresh).
function buildProfiloIniziale(fu: any): Record<string, any> {
  var np = (fu.displayName || '').split(' ');
  return {
    nome: np[0] || 'Utente',
    cognome: np.slice(1).join(' ') || '',
    // Persisto anche il displayName Google: è usato come chiave
    // canonica per le Firestore Rules (quiz_risposte, ammonizioni)
    // che confrontano resource.data.studente == request.auth.token.name.
    displayName: fu.displayName || (np[0] + ' ' + (np.slice(1).join(' ') || '')).trim() || null,
    email: fu.email || null,
    role: 'studente',
    provider: 'google',
    classiPerAnno: {},
  };
}

// Crea il profilo solo se manca (get + set condizionale). Ritorna true se il
// doc esiste (già prima o creato ora), false se la creazione è fallita
// (es. permission-denied / rete giù: il chiamante decide come proseguire).
async function ensureProfilo(db: any, fu: any): Promise<boolean> {
  try {
    var ud = await db.collection('users').doc(fu.uid).get();
    if (ud.exists) return true;
    await db.collection('users').doc(fu.uid).set(buildProfiloIniziale(fu));
    return true;
  } catch (e: any) {
    console.error('[auth] ensureProfilo fallito:', e && e.code, e && e.message);
    return false;
  }
}

// L'email può essere transiente (primo tick di onAuthStateChanged / token non
// ancora popolato): prima un email null causava sign-out immediato di utenti
// legittimi @ferrarisfermiclass.it, che poi "riuscivano dopo un po'" al
// secondo tentativo. Se l'email manca, prova un reload del FirebaseUser prima
// di dichiararlo non autorizzato.
async function emailAutorizzataConReload(fu: any): Promise<boolean> {
  if (isEmailAutorizzata(fu.email)) return true;
  if (fu.email) return false; // email presente ma fuori dominio → negato subito
  try {
    if (fu && typeof fu.reload === 'function') {
      await fu.reload();
      // Alcuni SDK aggiornano fu.email in place, altri richiedono di
      // rileggerlo dal currentUser: prova entrambi.
      var freshEmail = fu.email || null;
      try {
        if (typeof firebase !== 'undefined' && firebase.auth) {
          var cur = firebase.auth().currentUser;
          if (cur && cur.email) freshEmail = cur.email;
        }
      } catch (e) {}
      if (isEmailAutorizzata(freshEmail)) {
        try {
          fu.email = freshEmail;
        } catch (e) {}
        return true;
      }
    }
  } catch (e) {}
  // Ultimo tentativo: claim email dentro l'ID token (copre il caso di
  // fu.email null ma token già popolato).
  try {
    if (fu && typeof fu.getIdTokenResult === 'function') {
      var tok = await fu.getIdTokenResult();
      var claimEmail = (tok && tok.claims && (tok.claims.email as string)) || null;
      if (isEmailAutorizzata(claimEmail)) {
        try {
          fu.email = claimEmail;
        } catch (e) {}
        return true;
      }
    }
  } catch (e) {}
  return false;
}

export function useAuth(_annoScolastico: string) {
  // AuthUser | null: stato autenticato (merge doc users/{uid}) o non autenticato
  var [user, setUser] = useState<AuthUser | null>(null);
  var [authLoad, setAuthLoad] = useState(true);
  var [isProf, setIsProf] = useState(false);
  // Errore visibile sulla login quando il profilo non si riesce a caricare
  // (es. Firestore irraggiungibile dopo tutti i retry): prima l'utente atterrava
  // sulla login senza alcunché, scambiandolo per "credenziali non valide".
  var [authErr, setAuthErr] = useState<string | null>(null);
  // Guard against missing Firebase auth
  var auth: any = null;
  if (typeof firebase === 'undefined' || typeof firebase.auth !== 'function') {
    console.error('[auth] Firebase Auth not available. App will start in offline mode.');
  } else {
    auth = firebase.auth();
  } // Tipo strutturale dell'utente: matcha l'interfaccia `User` (storica in
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

  // Guard offline: come per auth, anche firestore può mancare (es. SDK non
  // caricato) → prima questo punto crashava con ReferenceError appena montato
  // il provider, invece di partire in modalità offline con la login.
  var db: any = null;
  try {
    if (typeof firebase !== 'undefined' && typeof firebase.firestore === 'function') {
      db = firebase.firestore();
    }
  } catch (e) {
    console.error('[auth] Firebase Firestore not available. Offline mode.');
  }
  SB.LS = SB.LS || {};
  useEffect(function () {
    if (!auth || !db) {
      setAuthLoad(false);
      return;
    }
    // Guardie per le catene async di loadProfilo (vedi onAuthStateChanged):
    // `cancelled` allo smontaggio, `chainId` per invalidare i retry di un fire
    // precedente quando ne parte uno nuovo.
    var cancelled = false;
    var chainId = 0;
    auth
      .getRedirectResult()
      .then(async function (cr: any) {
        if (!cr || !cr.user) return;
        var fu = cr.user;
        // Filtro accesso: account fuori dominio/whitelist → sign-out immediato,
        // prima ancora di toccare Firestore. L'email può essere transiente al
        // primo tick: ricontrolla con reload prima di negare (vedi
        // emailAutorizzataConReload) per non buttare fuori utenti legittimi.
        if (!(await emailAutorizzataConReload(fu))) {
          negaAccesso(auth);
          return;
        }
        try {
          var ud0 = await db.collection('users').doc(fu.uid).get();
          if (!ud0.exists) {
            await db.collection('users').doc(fu.uid).set(buildProfiloIniziale(fu));
          } else if (!ud0.data().displayName && fu.displayName) {
            // Backfill: utenti esistenti senza displayName lo ricevono al primo login
            await db.collection('users').doc(fu.uid).update({ displayName: fu.displayName });
          }
        } catch (err: any) {
          console.error(
            '[auth] getRedirectResult: lettura profilo users/{uid} fallita:',
            err && err.code,
            err && err.message
          );
        }
      })
      .catch(function (err: any) {
        console.error('[auth] getRedirectResult fallito:', err && err.code, err && err.message);
      });
    // Timeout di sicurezza: se Firebase non risponde affatto (offline totale),
    // mostra comunque la login invece dello spinner infinito. Coordinato con
    // il backoff di loadProfilo (~15s): scatta DOPO l'ultimo retry così non
    // causa flash della login mentre il profilo è ancora in creazione
    // (30 primi accessi concorrenti + wifi lenta della scuola).
    var authTimeout = setTimeout(function () {
      setAuthLoad(false);
    }, 20000);
    var unsub = auth.onAuthStateChanged(function (fu: any) {
      clearTimeout(authTimeout);
      if (fu) {
        // Ogni fire di onAuthStateChanged (login, token refresh, ...) avvia una
        // catena di retry: il contatore invalida le catene precedenti così due
        // letture sovrapposte non si pestano i piedi, e `cancelled` evita
        // setState dopo lo smontaggio (le catene ora durano ~15s+).
        var myChain = ++chainId;
        setAuthErr(null); // nuovo evento auth → l'errore precedente non vale più
        // Filtro accesso su sessioni persistite (es. login via redirect
        // dell'accesso precedente): disconnessione immediata se non autorizzato.
        // Async a causa del reload in caso di email transiente: nel frattempo
        // resta lo spinner (authLoad true), MAI un sign-out affrettato.
        emailAutorizzataConReload(fu).then(function (ok: boolean) {
          if (cancelled || myChain !== chainId) return;
          if (!ok) {
            negaAccesso(auth);
            setUser(null);
            setIsProf(false);
            setAuthLoad(false);
            return;
          }
          loadProfilo(fu, 0, myChain);
        });
        // FIX race redirect / primi accessi concorrenti: getRedirectResult
        // crea il doc users/{uid} in modo asincrono e 30 creazioni simultanee
        // su rete lenta possono metterci >2.5s; prima loadProfilo riprovava
        // solo 5×500ms e poi parcheggiava l'utente autenticato sulla login
        // ("fantasma" fino al refresh — da qui "alcuni entrano, altri no, poi
        // dopo un po' entrano tutti"). Ora: backoff esponenziale fino a ~15s
        // e, se il doc manca ancora, SELF-HEALING (lo crea qui invece di
        // buttare l'utente sulla login).
        // Backoff esponenziale per tentativo (indice 0-based).
        var BACKOFF_MS = [500, 750, 1000, 1500, 2000, 2500, 3000, 3000];
        function loadProfilo(fu: any, attempt: number, id: number): void {
          db.collection('users')
            .doc(fu.uid)
            .get()
            .then(function (doc: any) {
              if (cancelled || id !== chainId) return;
              var base = { uid: fu.uid, email: fu.email, displayName: fu.displayName, photoURL: fu.photoURL };
              if (doc.exists) {
                var d = doc.data();
                var finalUser = Object.assign({}, base, d) as AuthUser;
                setUser(finalUser);
                setIsProf(finalUser.role === 'prof');
                setAuthErr(null);
                setAuthLoad(false);
              } else if (attempt < BACKOFF_MS.length) {
                setTimeout(function () {
                  if (cancelled || id !== chainId) return;
                  loadProfilo(fu, attempt + 1, id);
                }, BACKOFF_MS[attempt]);
              } else {
                // Self-healing: il doc non è mai apparso (create del redirect
                // persa per rete/regole, oppure login popup su altro tab).
                // Crealo ora invece di parcheggiare l'utente sulla login.
                ensureProfilo(db, fu).then(function (ok: boolean) {
                  if (cancelled || id !== chainId) return;
                  if (!ok) {
                    setUser(null);
                    setIsProf(false);
                    setAuthErr(MSG_DB_DOWN);
                    setAuthLoad(false);
                    return;
                  }
                  db.collection('users')
                    .doc(fu.uid)
                    .get()
                    .then(function (doc2: any) {
                      if (cancelled || id !== chainId) return;
                      var base2 = {
                        uid: fu.uid,
                        email: fu.email,
                        displayName: fu.displayName,
                        photoURL: fu.photoURL,
                      };
                      var d2 = doc2.exists ? doc2.data() : {};
                      var finalUser2 = Object.assign({}, base2, d2) as AuthUser;
                      setUser(finalUser2);
                      setIsProf(finalUser2.role === 'prof');
                      setAuthErr(null);
                      setAuthLoad(false);
                    })
                    .catch(function (err: any) {
                      if (cancelled || id !== chainId) return;
                      console.error(
                        '[auth] rilettura profilo dopo self-heal fallita:',
                        err && err.code,
                        err && err.message
                      );
                      setUser(null);
                      setIsProf(false);
                      setAuthErr(MSG_DB_DOWN);
                      setAuthLoad(false);
                    });
                });
              }
            })
            .catch(function (err: any) {
              if (cancelled || id !== chainId) return;
              if (attempt < BACKOFF_MS.length) {
                setTimeout(function () {
                  if (cancelled || id !== chainId) return;
                  loadProfilo(fu, attempt + 1, id);
                }, BACKOFF_MS[attempt]);
                return;
              }
              // Es. permission-denied (regole non pubblicate / token senza email)
              // o rete giù: non lasciare l'app sullo spinner all'infinito —
              // mostra la login CON messaggio (non sembra un rifiuto credenziali).
              console.error('[auth] lettura profilo users/{uid} fallita:', err && err.code, err && err.message);
              setUser(null);
              setIsProf(false);
              setAuthErr(MSG_DB_DOWN);
              setAuthLoad(false);
            });
        }
      } else {
        setUser(null);
        setIsProf(false);
        setAuthErr(null);
        setAuthLoad(false);
      }
    });
    return function () {
      cancelled = true;
      if (typeof unsub === 'function') unsub();
      clearTimeout(authTimeout);
    };
  }, []);
  async function loginGoogle() {
    if (!auth || !db) {
      if (window.SB_DEBUG) console.warn('[auth] Firebase auth/firestore not available; login aborted.');
      return;
    }
    setAuthErr(null); // nuovo tentativo → l'errore precedente non vale più
    var fu: any;
    try {
      var provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      var cr = await auth.signInWithPopup(provider);
      fu = cr.user;
    } catch (e: any) {
      // Fallback robusto al redirect (signInWithRedirect NON apre un popup
      // cross-origin, quindi non è affetto da COOP/Cross-Origin-Opener-Policy:
      // su dispositivi/browser dove il popup fallisce — popup bloccato, rete,
      // o COOP che impedisce la comunicazione con window.opener (warning
      // "Cross-Origin-Opener-Policy policy would block the window.closed") —
      // il login proseguirebbe senza esito. Unico caso in cui NON si ripiega:
      // l'utente ha annullato esplicitamente (chiuso il popup o seconda
      // richiesta cancellata) — in quel caso rispettiamo la sua scelta.
      var noFallback = e && (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request');
      if (!noFallback) {
        console.error('[auth] signInWithPopup fallito, fallback a redirect:', e && e.code, e && e.message);
        try {
          // Stessi custom parameters del popup: sui dispositivi condivisi della
          // scuola il selettore d'account evita l'auto-login con l'account
          // sbagliato (es. gmail personale del fratello) → "non riesco ad
          // entrare" + alert di accesso non autorizzato apparentemente inspiegabile.
          var redirectProvider = new firebase.auth.GoogleAuthProvider();
          if (typeof redirectProvider.setCustomParameters === 'function') {
            redirectProvider.setCustomParameters({ prompt: 'select_account' });
          }
          await auth.signInWithRedirect(redirectProvider);
        } catch (e2: any) {
          console.error('[auth] signInWithRedirect fallito:', e2 && e2.code, e2 && e2.message);
          setAuthErr(MSG_DB_DOWN);
        }
      }
      return;
    }
    // Popup riuscito: da qui gli errori sono di Firestore (profilo), NON del
    // popup — MAI fallback a redirect (ricaricherebbe la pagina con utente già
    // autenticato). Errore visibile sulla login.
    try {
      // Filtro accesso: nessun profilo viene creato per email non autorizzate.
      // Come in onAuthStateChanged, l'email può essere transiente al primo
      // tick: reload prima di negare.
      if (fu && !(await emailAutorizzataConReload(fu))) {
        negaAccesso(auth);
        return;
      }
      if (!fu) return;
      var ud = await db.collection('users').doc(fu.uid).get();
      if (!ud.exists) {
        await db.collection('users').doc(fu.uid).set(buildProfiloIniziale(fu));
      } else {
        // Backfill displayName su utenti esistenti che ancora non lo hanno
        var existing = ud.data();
        if (!existing.displayName && fu.displayName) {
          await db.collection('users').doc(fu.uid).update({ displayName: fu.displayName });
        }
      }
    } catch (e3: any) {
      console.error('[auth] loginGoogle: profilo non creato/letto:', e3 && e3.code, e3 && e3.message);
      setAuthErr(MSG_DB_DOWN);
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
    setAuthErr(null);
  }
  return { user, isProf, loginGoogle, logout, authLoad, authErr, setUser };
}
