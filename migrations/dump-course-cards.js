// dump-course-cards.js — SOLA LETTURA: scarica le card del corso base AI
// e le salva in formato JSON per costruire un test di render dell'app.
// Uso: node migrations/dump-course-cards.js out.json

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const SA = path.join(__dirname, 'service-account.json');
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(SA) });
}
const db = admin.firestore();

(async () => {
  const snap = await db.collection('cards').get();
  const cards = [];
  snap.forEach((d) => {
    const c = Object.assign({ id: d.id }, d.data());
    if ((Array.isArray(c.classi) ? c.classi : []).some((cl) => String(cl).toLowerCase().includes('corso base ai'))) {
      cards.push(c);
    }
  });
  cards.sort((a, b) => (a.ordine || 0) - (b.ordine || 0));

  const out = process.argv[2] || 'course-cards.json';
  fs.writeFileSync(path.join(__dirname, out), JSON.stringify(cards, null, 2));
  console.log('Scaricate ' + cards.length + ' card in ' + out);
  cards.forEach((c) => {
    const size = new Blob([JSON.stringify(c)]).size;
    console.log(
      '  [' + c.id + '] tipo=' + c.tipo + ' titolo="' + (c.titolo || '').slice(0, 40) + '" ' +
        Math.round(size / 1024) + 'KB quizDomande=' + (Array.isArray(c.quizDomande) ? c.quizDomande.length : 0)
    );
  });
  process.exit(0);
})().catch((e) => {
  console.error('ERRORE:', e.message);
  process.exit(2);
});
