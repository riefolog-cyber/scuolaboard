firebase.initializeApp({
  apiKey: 'AIzaSyDIC39upI9VnY10MdP7__7l3omyGqspHNA',
  authDomain: 'scuolaboard-874d4.firebaseapp.com',
  projectId: 'scuolaboard-874d4',
  storageBucket: 'scuolaboard-874d4.firebasestorage.app',
  messagingSenderId: '249372381209',
  appId: '1:249372381209:web:737697d4d10b3ae06eda88',
});

// Define SB (firebase-init.js è il PRIMO script caricato, window.SB non
// esiste ancora — va creato qui.)
var SB = window.SB || {};
window.SB = SB;

// Storage instance per file uploads — graceful skip su piano Spark/free
// (Firebase Storage richiede Blaze). L'app non usa Storage (immagini base64
// in Firestore), ma lasciamo graceful fallback per futuro upgrade piano.
try {
  if (firebase.storage && firebase.app().options.storageBucket) {
    SB.storage = firebase.storage();
    window.storage = SB.storage;
  } else {
    SB.storage = null;
    window.storage = null;
  }
} catch (e) {
  SB.storage = null;
  window.storage = null;
}

// Firestore instance
if (firebase.firestore) {
  SB.db = firebase.firestore();
  window.db = SB.db;
}
