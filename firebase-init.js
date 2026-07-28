(function(){
  firebase.initializeApp({
    apiKey:"AIzaSyDIC39upI9VnY10MdP7__7l3omyGqspHNA",
    authDomain:"scuolaboard-874d4.firebaseapp.com",
    projectId:"scuolaboard-874d4",
    storageBucket:"scuolaboard-874d4.firebasestorage.app",
    messagingSenderId:"249372381209",
    appId:"1:249372381209:web:737697d4d10b3ae06eda88"
  });

  // Define SB BEFORE App Check activates so that SB.appCheckEnabled setter works.
  // (importante: firebase-init.js è il PRIMO script caricato, quindi window.SB non
  // esiste ancora — va creato qui.)
  var SB = window.SB || {};
  window.SB = SB;

  // APP CHECK (commentato nel file originale)
  var appCheckKey = (window.SB_CONFIG && window.SB_CONFIG.APP_CHECK_RECAPTCHA_KEY)
                  || window.__APP_CHECK_RECAPTCHA_KEY
                  || null;
  if(appCheckKey && firebase.appCheck){
    try {
      firebase.appCheck().activate(new firebase.appCheck.ReCaptchaV3Provider(appCheckKey));
      SB.appCheckEnabled = true;
      console.info("[ScuolaBoard] Firebase App Check attivato (reCAPTCHA v3).");
    } catch(e){
      SB.appCheckEnabled = false;
      console.warn("[ScuolaBoard] Errore attivazione App Check:", e && e.message);
    }
  } else {
    SB.appCheckEnabled = false;
    console.info("[ScuolaBoard] App Check NON attivo. Per attivarlo configura SB_CONFIG.APP_CHECK_RECAPTCHA_KEY.");
  }

  // Storage instance per file uploads — graceful skip su piano Spark/free
  // (Firebase Storage richiede Blaze). L'app non usa Storage (immagini base64
  // in Firestore), ma lasciamo graceful fallback per futuro upgrade piano.
  try {
    if(firebase.storage && firebase.app().options.storageBucket){
      SB.storage = firebase.storage();
      window.storage = SB.storage;
    } else {
      SB.storage = null;
      window.storage = null;
    }
  } catch(e){
    SB.storage = null;
    window.storage = null;
    console.info("[ScuolaBoard] Storage non disponibile (probabilmente piano Spark/free). Upload disabilitato.");
  }

  // Firestore instance (already used elsewhere as db)
  if(firebase.firestore){
    SB.db = firebase.firestore();
    // Ensure global db variable points to Firestore (used throughout the app)
    window.db = SB.db;
  }
})();
