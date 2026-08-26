# 📌 Promemoria — Privacy e Manutenzione ScuolaBoard

> Creato il 22/08/2026 · Riferimenti: `Sintesi_Conformita_ScuolaBoard_Regolamento_IA.md`, `README.md`

## ✅ Fatto

- [x] Filtro email login: solo `@ferrarisfermiclass.it` + whitelist docente (`riefolog@gmail.com`)
  - Client-side in `src/auth.ts` (popup, redirect, sessioni persistite) + server-side nelle Firestore Rules
- [x] Pseudonimizzazione commenti prima dell'invio a Groq (`ai-services.ts`)
- [x] Badge trasparenza IA + human-in-the-loop sui quiz

## ⚠️ DA FARE SUBITO (al prossimo deploy)

- [ ] Pubblicare le regole aggiornate: Firebase Console → Firestore → Rules → Pubblica (file: `rules firestore.txt`)
- [ ] **Creare l'indice composito `(annoScolastico ASC, visibile ASC)`** — Firestore → Indexes (o clicca il link nell'errore al primo accesso studente). Senza, la query card degli studenti fallisce
- [ ] Verificare che in `users/{uid}` non esistano profili legacy con email fuori whitelist
- [ ] Verificare che il docente abbia `role: "prof"` nel proprio `users/{uid}` (il login crea il profilo con `role: "studente"` di default → vista studente)
- [ ] Test pre-settembre: Gmail docente ✅ / account scuola ✅ / Gmail estraneo ❌ (messaggio accesso negato)

## 🔒 PRIVACY — priorità alta

- [ ] `PrivacyModal`: aggiungere titolare, dati raccolti, pseudonimizzazione AI, diritti (Art. 13 GDPR)
- [ ] Salvare l'accettazione privacy su Firestore (`consensi/{uid}` con timestamp), non solo localStorage
- [ ] Documentare la procedura di cancellazione su richiesta (oblio): profilo,
      commenti nelle card, `quiz_risposte`, `ammonizioni` → anonimizzare il displayName
- [ ] Verificare DPA/zero-retention di Groq e archiviarlo con l'Allegato B2

## 🔧 TECNICA — priorità media

- [x] Blindare `classiPerAnno` nelle rules (helper `classiPerAnnoSoloAggiunte()` in `rules firestore.txt`: lo studente può solo AGGIUNGERE un anno nuovo senza classe, mai modificare/rimuovere la classe già scelta; il prof resta libero). ⚠️ DA RIPUBBLICARE in console
- [ ] Backup periodico Firestore (lo storico è ora la scelta definitiva: si conserva tutto!)
  - Decisione 22/08/2026: NO cancellazione studenti classe 5 anno scorso — resta lo storico
- [ ] Valutare Firebase App Check (blocca client esterni anche autenticati)
- [ ] Policy ammonizioni: revisione a fine anno, eliminazione delle risolte

## 💡 QUANDO SERVE

- [ ] Custom claim per ruolo prof (utile solo con più docenti)

## 📝 Note operative

- Scelta classe studente: una volta per anno scolastico, poi bloccata (modale automatica al primo accesso)
- Lo studente vede SOLO le card della sua classe + quelle marcate `TUTTE`
- Avviso Firebase Dynamic Links in Authentication: NON ci riguarda (usiamo solo Google popup/redirect)
