// verify-cards.js — VERIFICA IN SOLA LETTURA (nessuna scrittura).
// Legge tutte le card di Firestore, identifica quelle del corso base AI
// (classe custom contenente "corso base ai") e le valida contro i bug noti:
//  1. quizDomande presenti ma tipo != 'quiz' (card "orfane" invisibili)
//  2. domande quiz malformate (senza testo, opzioni insufficienti, ecc.)
//  3. campi obbligatori mancanti (titolo, ordine, annoScolastico, data, autore)
//  4. opzioni sondaggio malformate
//  5. dimensione documento eccessiva
//
// Uso: node migrations/verify-cards.js [--all]
//   default: solo card del corso base AI (classe custom con "corso base ai")
//   --all:   tutte le card

const admin = require('firebase-admin');
const path = require('path');

const SA = path.join(__dirname, 'service-account.json');
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(SA) });
}
const db = admin.firestore();

function classeCorsoBaseAI(card) {
  const classi = Array.isArray(card.classi) ? card.classi : [];
  return classi.some((c) => String(c).toLowerCase().includes('corso base ai'));
}

function problemi(card) {
  const p = [];
  const id = String(card.id);

  // 1. Campi obbligatori
  if (!card.titolo || !String(card.titolo).trim()) p.push('titolo mancante');
  if (!card.tipo) p.push('tipo mancante');
  if (!card.annoScolastico) p.push('annoScolastico mancante (card invisibile nel filtro anno!)');
  if (card.ordine == null) p.push('ordine mancante');
  if (!card.data) p.push('data mancante');
  if (!card.autore) p.push('autore mancante');

  // 2. Tipo valido
  const TIPI = ['domanda', 'sondaggio', 'quiz', 'nota'];
  if (card.tipo && TIPI.indexOf(card.tipo) < 0) p.push('tipo sconosciuto: ' + card.tipo);

  // 3. Quiz: domande orfane (il bug di oggi!)
  const qd = card.quizDomande;
  const haQuiz = Array.isArray(qd) && qd.length > 0;
  if (haQuiz && card.tipo !== 'quiz') {
    p.push('ORFANE: ' + qd.length + ' quizDomande ma tipo=' + card.tipo + ' (invisibile in griglia/dettaglio!)');
  }
  if (card.tipo === 'quiz' && !haQuiz) p.push('tipo quiz ma quizDomande assente/vuoto');

  // 4. Domande quiz malformate
  if (haQuiz) {
    qd.forEach((d, i) => {
      if (!d || !d.testo || !String(d.testo).trim()) p.push('quiz domanda #' + (i + 1) + ' senza testo');
      if (d.tipo === 'multipla') {
        const ops = (d.opzioni || []).filter((o) => o && String(o).trim());
        if (ops.length < 2) p.push('quiz domanda #' + (i + 1) + ' multipla con <2 opzioni valide');
        if (d.corretta == null || d.corretta === '') p.push('quiz domanda #' + (i + 1) + ' multipla senza corretta');
        else if (isNaN(Number(d.corretta)) || Number(d.corretta) < 0 || Number(d.corretta) >= ops.length) {
          p.push('quiz domanda #' + (i + 1) + ' corretta=' + d.corretta + ' fuori range opzioni');
        }
      }
    });
  }

  // 5. Sondaggio: opzioni malformate
  if (card.tipo === 'sondaggio') {
    if (!Array.isArray(card.opzioni) || card.opzioni.length < 2) {
      p.push('sondaggio senza >=2 opzioni');
    } else {
      card.opzioni.forEach((o, i) => {
        if (!o || !o.testo || !String(o.testo).trim()) p.push('sondaggio opzione #' + (i + 1) + ' senza testo');
      });
    }
  }

  // 6. Dimensione doc (limite Firestore 1 MiB, guard app ~900KB)
  const size = new Blob([JSON.stringify(card)]).size;
  if (size > 900 * 1024) p.push('doc ' + Math.round(size / 1024) + 'KB > guard 900KB');

  return p;
}

(async () => {
  const onlyBaseAI = !process.argv.includes('--all');
  const snap = await db.collection('cards').get();
  const cards = [];
  snap.forEach((d) => cards.push(Object.assign({ id: d.id }, d.data())));

  let target = cards;
  if (onlyBaseAI) target = cards.filter(classeCorsoBaseAI);

  console.log('Totale card in Firestore: ' + cards.length);
  console.log('Card corso base AI (classe contenente "corso base ai"): ' + target.length);
  if (onlyBaseAI) console.log('(usa --all per verificare TUTTE le card)\n');

  // Riepilogo per classe per aiutare a capire se il filtro è giusto
  const perClasse = {};
  cards.forEach((c) => {
    (Array.isArray(c.classi) ? c.classi : ['(nessuna)']).forEach((cl) => {
      perClasse[cl] = (perClasse[cl] || 0) + 1;
    });
  });
  console.log('Distribuzione card per classe (prime 25):');
  Object.entries(perClasse)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .forEach(([cl, n]) => console.log('  ' + n + '\t' + cl));

  let conProblemi = 0;
  const dettagli = [];
  target.forEach((c) => {
    const p = problemi(c);
    if (p.length) {
      conProblemi++;
      dettagli.push({ id: c.id, titolo: c.titolo, tipo: c.tipo, problemi: p });
    }
  });

  console.log('\n=== RISULTATO ===');
  if (conProblemi === 0) {
    console.log('✅ Nessun problema trovato nelle ' + target.length + ' card verificate.');
  } else {
    console.log('❌ ' + conProblemi + ' card con problemi su ' + target.length + ':');
    dettagli.forEach((d) => {
      console.log('\n[' + d.id + '] "' + (d.titolo || '?') + '" (tipo=' + d.tipo + ')');
      d.problemi.forEach((pr) => console.log('   - ' + pr));
    });
  }
  process.exit(conProblemi ? 1 : 0);
})().catch((e) => {
  console.error('ERRORE:', e.message);
  process.exit(2);
});
