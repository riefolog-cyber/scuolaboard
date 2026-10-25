# 📌 Promemoria — Privacy e Manutenzione ScuolaBoard

> Creato il 22/08/2026 · Aggiornato il 25/10/2026 · Riferimenti: `Sintesi_Conformita_ScuolaBoard_Regolamento_IA.md`, `README.md`

## ✅ Fatto

- [x] Filtro email login: solo `@ferrarisfermiclass.it` + whitelist docente (`riefolog@gmail.com`)
  - Client-side in `src/auth.ts` (popup, redirect, sessioni persistite) + server-side nelle Firestore Rules
- [x] Pseudonimizzazione commenti prima dell'invio a Groq (`ai-services.ts`)
- [x] Badge trasparenza IA + human-in-the-loop sui quiz

## ⚠️ DA FARE SUBITO (al prossimo deploy)

- [x] Pubblicare le regole aggiornate: Firebase Console → Firestore → Rules → Pubblica (file: `rules firestore.txt`).
  **Fatto il 25/10/2026**, compresa `match /cards/{cardId}/allegati/{fileId}` e `classiPerAnnoSoloAggiunte()`: il salvataggio degli allegati in produzione passa.
  ⚠️ Resta valido per ogni modifica futura: un cambio alle rules senza pubblicazione è un cambio incompleto.
- [x] ~~Creare l'indice composito `(annoScolastico ASC, visibile ASC)`~~ **NON SERVE, verificato il 05/10/2026.**
  La query dello studente (`src/firestore-sync.ts`: `where('annoScolastico','==',anno).where('visibile','==',true)`)
  è passata su Firestore reale (`npm run dev` → progetto `scuolaboard-874d4`, non l'emulatore) restituendo
  le card. L'indicazione era un residuo: l'indice composito si rende necessario quando un `orderBy` su un
  campo diverso accompagna i filtri, e l'`orderBy('ordine')` fu tolto di proposito per questo motivo
  (l'ordinamento è client-side, vedi `visibleSorted` in `cards.ts`). Nota: due filtri di sola uguaglianza
  sono serviti dagli indici singoli automatici.
- [ ] Verificare che in `users/{uid}` non esistano profili legacy con email fuori whitelist
- [x] Pubblicare il nuovo blocco `match /consensi/{uid}` — **fatto il 25/10/2026** (Firebase Console → Firestore → Rules → Pubblica). Senza, l'accettazione dell'informativa restava solo in localStorage e la prova su Firestore veniva negata da una regola default-deny.
- [x] Verificare che il docente abbia `role: "prof"` nel proprio `users/{uid}` — **verificato il 25/10/2026**: la scrittura degli allegati, che le rules ammettono solo al docente, riesce in produzione.
- [ ] Test pre-settembre: Gmail docente ✅ / account scuola ✅ / Gmail estraneo ❌ (messaggio accesso negato)

## 🔒 PRIVACY — priorità alta

- [x] `PrivacyModal`: informativa ai sensi dell'art. 13 GDPR — titolare, dati trattati, finalità e base giuridica, destinatari (Firebase, Cloudflare, Groq), trasferimenti extra-UE, conservazione, diritti. Gli estremi del Titolare e i recapiti del DPO restano nell'Informativa d'Istituto (unico documento ufficiale, aggiornabile senza deploy). Verificata nel test di integrazione sui consensi.
- [x] Salvare l'accettazione privacy su Firestore (`consensi/{uid}` con `versione`, `accettato: true`, `ts`), non solo localStorage: `src/consensi-servizio.ts`, chiamato dalla `PrivacyModal`. All'avvio la registrazione viene letta, quindi chi ha accettato dal telefono non se la vede richiedere sul computer. Nessun dato accessorio (IP, user agent) e nessun dato personale nei log.
  Rules pubblicate il 25/10/2026: la scrittura su Firestore è attiva.
- [x] Documentare la procedura di cancellazione su richiesta (oblio): [PRIVACY_CANCELLAZIONE.md](PRIVACY_CANCELLAZIONE.md) — ordine delle operazioni (il displayName va annotato **prima** di cancellare il profilo, perché è l'id di `quiz_risposte` e `ammonizioni`), cosa si cancella per uid e cosa si rimuove per nome dentro le card, quando anonimizzare invece di cancellare.
- [ ] Verificare DPA/zero-retention di Groq e archiviarlo con l'Allegato B2

## 🔧 TECNICA — priorità media

- [x] Blindare `classiPerAnno` nelle rules (helper `classiPerAnnoSoloAggiunte()` in `rules firestore.txt`: lo studente può solo AGGIUNGERE un anno nuovo senza classe, mai modificare/rimuovere la classe già scelta; il prof resta libero). Pubblicato in console il 25/10/2026.
- [x] Allegati delle card in sottocollezione `cards/{id}/allegati/{fileId}` (un documento per file, `src/allegati-card-servizio.ts`): il documento della card tiene solo i metadati, quindi copertina + PDF non sfondano più il MiB. Duplicare e copiare in un altro anno **copiano** i file (la copia è indipendente) e eliminare una card li cancella.
- [x] Errori di salvataggio degli allegati diagnosticabili: il toast dice il motivo (permesso negato dalle regole/ruolo, sessione scaduta, rete assente, quota, client senza supporto alle sottocollezioni) invece di un «Riprova» muto — è il buco che il 25/10/2026 ha reso invisibile un bug dello shim compat.
- [x] Misurare lo spazio Firestore occupato — **misurato il 25/10/2026: 24,1 MiB** (dati + indici del database `(default)`), cioè il **2,4% del GiB gratuito**, con circa 1000 MiB di margine; nell'ultima settimana è stabile fra 23,85 e 24,15 MiB.
  Firebase **non espone** il dato (né Firestore → Utilizzo né Utilizzo e fatturazione: mostrano operazioni e la sola soglia «byte archiviati oltre 1 GB»). La fonte ufficiale è la metrica Cloud Monitoring `firestore.googleapis.com/storage/data_and_index_storage_bytes` sulla risorsa `firestore.googleapis.com/Database`, letta in Esplora metriche con filtro `database_id = (default)`.
  Da ricontrollare quando le card con allegati crescono: ogni duplica e ogni copia in altro anno **copiano** i file, quindi lo spazio cresce con le copie e non solo con le card.
- [ ] Backup periodico Firestore (lo storico è ora la scelta definitiva: si conserva tutto!)
  - Decisione 22/08/2026: NO cancellazione studenti classe 5 anno scorso — resta lo storico
- [ ] Valutare Firebase App Check (blocca client esterni anche autenticati)
- [ ] Policy ammonizioni: revisione a fine anno, eliminazione delle risolte

## 💡 QUANDO SERVE

- [ ] Custom claim per ruolo prof (utile solo con più docenti)

## 📝 Note operative

- Scelta classe studente: una volta per anno scolastico, poi bloccata (modale automatica al primo accesso)
- Allegati: i PDF/immagini stanno in `cards/{id}/allegati/{fileId}`, non nel documento della card (tetto 700KB per file, `MAX_ALLEGATO_KB`)
- Lo studente vede SOLO le card della sua classe + quelle marcate `TUTTE`
- Avviso Firebase Dynamic Links in Authentication: NON ci riguarda (usiamo solo Google popup/redirect)
