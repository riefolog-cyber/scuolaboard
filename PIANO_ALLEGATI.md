# PIANO — allegati delle card in una sottocollezione ("piano 1")

Piano salvato il **24/10/2026** per riprenderlo il giorno dopo. Non è ancora
iniziato: **nessuna riga di questo piano è stata scritta nel codice.**

## Perché

Le immagini e gli allegati sono data URL base64 **dentro** il documento della
card. Firestore ha un limite rigido di **1 MiB per documento**, quindi testo +
commenti + copertina + galleria + PDF devono stare tutti insieme. Caso reale che
ha aperto il tema: card con copertina + due PDF → documento da 961KB, bloccato
dal guard a ~900KB al momento del salvataggio.

Limite di piano gratuito (Spark), per progetto e non per documento:

- **1 GiB** di dati salvati → in base64 ≈ **750MB di file reali**;
- 50.000 letture/giorno, 20.000 scritture/giorno (un file caricato = 1 scrittura).

Il piano 1 toglie il tetto **per card**, non quello di spazio complessivo.

## Cosa è già stato fatto (non rifarlo)

- `fix(card,upload)` — commit **a582955**, pushato su `main`. La copertina ora
  conta gli allegati già presenti e tutti i budget usano la stessa unità ("KB di
  documento" = caratteri base64), non più i byte del file (×0.75).
- Nessuna modifica alle Rules in quel commit: niente da ripubblicare.
- Lo spazio occupato dalla bacheca **non è ancora stato misurato**: manca
  `migrations/service-account.json` (git-ignored). Via rapida: Firebase Console →
  Firestore → Usage → Storage (numero ufficiale, include gli indici).

## Decisioni prese

- Si va con **la sottocollezione**, non con Firebase Storage: lo Storage
  richiede il piano Blaze, e nel repo non esiste (`firebase.storage()` è uno
  shim che restituisce `null`, c'è un test che lo fissa).
- **Niente Blaze, niente costi.** Il piano resta quello gratuito.
- Le card esistenti con il base64 dentro **continuano a funzionare**: la
  migrazione è lazy, quando il docente modifica quella card.
- Il limite per singolo file resta `MAX_ALLEGATO_KB` (700KB) finché non si
  decide diversamente (vedi "punti aperti").

## Precedente da imitare (esiste già nel repo)

`allegati_consegne` è la stessa forma di problema già risolta: un doc per utente,
regola dedicata, servizio separato, test statico che confronta codice e Rules.

- Rules: `rules firestore.txt` → `match /allegati_consegne/{uid}`
- Servizio: `src/allegato-consegna-servizio.ts` (non rifiuta mai, commenta il perché)
- Test: `src/allegato-consegna-servizio.test.ts`, `src/allegati-consegna-coerenti.test.ts`

## Passi (in quest'ordine)

### 1. Rules Firestore — scritte, NON pubblicate

Dentro `match /cards/{cardId}` aggiungere `match /allegati/{fileId}`:

- **read**: `isAuth() && (isProf() || get(/databases/$(database)/documents/cards/$(cardId)).data.visibile == true)`.
  Il `get()` sul padre costa 1 lettura ma evita che gli allegati di una card
  nascosta restino leggibili: gli id delle card sono timestamp, quindi
  indovinabili. Non copiare `visibile` nel doc allegato (deriva nel tempo).
- **create/update separati**: su `create` `resource` è `null`, quindi
  `resource.data` farebbe diventare la regola `false` in silenzio (vedi AGENTS.md).
  Ammettere solo le chiavi previste (es. `nome`, `tipo`, `dimensione`, `url`,
  `creato`), `url` che inizia per `data:`.
- **write solo docente**: gli studenti non scrivono allegati (il campo `allegati`
  è già vietato loro nella create della card).

Farsi trovare pronti a **pubblicarle a mano** in Console: finché non è
pubblicata, il codice nuovo non può funzionare in produzione.

### 2. Fake Firestore dei test

`src/integration/fake-firestore.ts` oggi conosce solo collection piatte
(`this.name`). Serve il supporto alle sottocollezioni
(`db.collection('cards').doc(id).collection('allegati')`), con nomi di path
distinti (es. `cards/<id>/allegati`) e `_failWrites` / `_all` che li
riconoscano. **Senza questo passo non esiste test di integrazione del flusso.**

### 3. Servizio

Nuovo `src/allegati-card-servizio.ts`, unico punto che parla con Firestore:

- `salvaAllegato(cardId, allegato)` / `salvaAllegati(cardId, allegati[])`
- `caricaAllegati(cardId)` → elenco `{id, name, type, size, url}`
- `eliminaAllegato(cardId, fileId)`
- `eliminaAllegatiDi(cardId)` (Firestore **non** fa cascade)

Stile del repo: non rifiuta mai verso l'interfaccia, ma **restituisce l'esito**,
perché qui un fallimento silenzioso significherebbe un file perso.

### 4. Modello dati

La card conserva `allegati: [{ id, name, type, size }]` — **senza `url`**. Il
contenuto vive in `cards/{cardId}/allegati/{fileId}`. `CardDetail` deve saper
leggere **entrambi** i formati: se `al.url` esiste (card vecchia) lo usa, altrimenti
chiede al servizio. È ciò che tiene in piedi l'archivio esistente.

### 5. Upload (`handleAllegatiUpload` / `addCard`)

Oggi il file resta in memoria nel form come base64 e viene salvato col documento.
Con il piano 1:

- si continua a tenere il base64 nel form (bozza in memoria, nessun upload immediato);
- al **salvataggio** si scrivono prima i documenti allegato, poi la card con i soli
  metadati — così una modale abbandonata non lascia file orfani;
- se la scrittura degli allegati fallisce, **non** si salva la card e si dice
  perché (niente card con l'elenco dei file che non esistono);
- in modifica, confronto vecchi/nuovi `allegati` per capire cosa cancellare.

### 6. Cancellazione, duplica, copia in altro anno

- `fbDel` / elimina card → `eliminaAllegatiDi(cardId)` prima o dopo la delete,
  con esito riportato (un orfano è spazio sprecato, non un errore bloccante).
- `buildDuplicaCopia` / `buildCopiaAnno` → i file vanno **copiati** o **condivisi**:
  decisione aperta (vedi sotto). Nel dubbio: copiare, perché condividere significa
  che cancellare una card rompe l'altra.

### 7. `CardDetail`

- Elenco file con nome e icona: arriva subito dalla card.
- Contenuto: caricamento on-demand, con stati "caricamento / errore / non
  disponibile". La preview HTML (`AllegatoHtmlPreview`, sandbox **senza**
  `allow-same-origin`) e il `download` usano lo stesso contenuto recuperato.
- Le regole di sicurezza sugli URL (`urlAllegatoSicuro`, `sbSafeUrl`) restano
  dove sono: il contenuto arriva da Firestore, non è più "fidato" di prima.

### 8. Migrazione lazy (fase 2, solo se il resto è verde)

Quando il docente modifica una card con base64 inline: spostare i file nella
sottocollezione, togliere `url` dalla card. Libera spazio e alleggerisce la
bacheca. Non farlo in automatico all'apertura (una lettura non deve scrivere).

### 9. Test da scrivere

- statico sulle Rules (come `allegati-consegna-coerenti.test.ts`);
- servizio: scrittura/lettura/cancellazione con il fake;
- integrazione: carico un PDF → salvo → la card ha i metadati, il doc allegato
  esiste, la card è piccola (`cardJsonSize` sotto il guard);
- compatibilità: una card vecchia con `url` inline si apre e si legge ancora;
- cancellazione card → niente allegati orfani;
- duplica → comportamento scelto al punto 6.

## Ordine di rilascio (importante)

1. Codice + test verdi, **senza push**.
2. Il docente pubblica le Rules in Console (passaggio manuale, non delegabile).
3. `git push` → la CI rigenera `docs/` e il sito si aggiorna.
4. Prova sul sito: card con PDF, anteprima HTML, download, cancellazione.

Così non esiste un momento in cui il sito ha il codice nuovo e le regole vecchie.

## Punti aperti (da decidere prima di iniziare)

1. **Contenuto caricato tutto all'apertura della card** (semplice) oppure **un file
   alla volta al click** (più leggero, più codice)?
2. **Duplica / copia in altro anno**: copiare i file (spazio doppio) o condividere
   i documenti (spazio singolo, ma cancellare una card rompe l'altra)?
3. **`MAX_ALLEGATO_KB`**: resta 700KB o sale a ~850KB ora che ogni file ha il suo
   documento da 1 MiB? (Se sale, va aggiornato anche il commento in AGENTS.md.)
4. **Misura dello spazio**: serve il numero della Console per sapere quanto margine
   c'è davvero sui 1 GiB (e quanto libererebbe la migrazione).

## Come riprendere

```bash
git pull
git log --oneline -3          # deve esserci a582955 (fix budget)
cat PIANO_ALLEGATI.md         # questo file
npm test                      # deve essere verde prima di toccare qualcosa
```

La prima azione concreta è il **passo 1** (Rules scritte e riviste, non
pubblicate) e il **passo 2** (fake Firestore con le sottocollezioni): senza
questi due il resto non è verificabile.
