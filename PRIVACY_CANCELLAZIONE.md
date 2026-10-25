# 🗑️ Cancellazione su richiesta (diritto all'oblio) — ScuolaBoard

Procedura operativa per quando uno studente (o chi ne esercita la patria potestà) chiede
la cancellazione dei propri dati. Riferimenti: artt. 17 e 21 GDPR, `PROMEMORIA_PRIVACY_MANUTENZIONE.md`.

> ⚠️ **L'ordine conta.** `quiz_risposte` e `ammonizioni` hanno come **id del documento il
> displayName** dello studente, non l'uid. Se cancelli prima `users/{uid}`, perdi il nome
> con cui ritrovare quei documenti. Annota il `displayName` (e il vecchio "nome cognome",
> se diverso) **prima** di toccare il profilo.

## 1. Registrare la richiesta

- Prendi nota di data, richiedente e ambito (tutti i dati, oppure solo alcune parti).
- Esporta prima una copia: `node migrations/export-firestore.js` (richiede
  `migrations/service-account.json`, sola lettura). Serve a te come traccia di cosa hai
  cancellato e quando; la copia va conservata fuori dal repository e distrutta a fine
  procedura se non è più necessaria.

## 2. Dati dell'account (id = uid)

Cancella (o svuota) i documenti con l'uid come id:

| Percorso | Cosa contiene |
|---|---|
| `users/{uid}` | profilo: displayName, nome, cognome, email, classe/i |
| `consensi/{uid}` | prova dell'accettazione dell'informativa |
| `notifiche/{uid}` | avvisi in-app (contengono anche pezzi di commenti altrui) |
| `preferiti/{uid}` | preferenze locali sincronizzate |
| `allegati_consegne/{uid}` | quali allegati HTML lo studente ha aperto |
| `ammonizioni/{displayName}` | ammonizioni, con motivazioni scritte dal docente |

## 3. Dati collegati al nome (id o valori = displayName)

Questi stanno **dentro documenti condivisi**: non si cancellano, si **rimuovono le voci**
dell'interessato. È la parte da fare con più attenzione, perché il campo è un array o una
mappa e la voce è il nome, non l'uid.

| Percorso | Voce da togliere |
|---|---|
| `cards/{id}` → `commenti[]` e `risposte[]` | elementi con `autore == displayName` |
| `cards/{id}` → `likesBy` (array di nomi) | il nome, e **decrementa `likes`** dello stesso numero |
| `cards/{id}` → `reazioni` (mappa emoji → array di nomi) | il nome da ogni array |
| `cards/{id}` → `opzioni[].voti` (array di nomi) | il nome da ogni opzione |
| `quiz_risposte/{displayName}` | l'intero documento (risposte e punteggio) |

Le chiavi storiche possono essere `displayName` **oppure** `nome + ' ' + cognome` (vedi le
Rules): controlla entrambe le forme.

## 4. Contenuti scritti dall'interessato (le sue card)

Dipende dallo stato della card, e la scelta va fatta con il docente:

- **proposta non approvata / non votata** → cancellala (`cards/{id}`, con la sua
  sottocollezione `allegati`).
- **proposta approvata e discussa in classe** → non cancellare la card (è materiale
  didattico condiviso, e la discussione appartiene anche agli altri): **anonimizza**
  l'autore (`autore: 'Studente cancellato'`) e, se il testo contiene dati personali,
  chiedi al docente di riformularlo.
- **commenti dello studente su card altrui**: si applica il punto 3 (rimozione delle voci),
  non la cancellazione della card.

## 5. Contenuti già passati all'IA

`ai_results/{docId}` conserva analisi e valutazioni generate sui testi (solo docente). I
testi inviati erano **pseudonimizzati**, quindi non contengono il nome; verifica comunque
se il contenuto riguarda l'interessato e, in caso affermativo, cancella la voce. Le
richieste di `riassuntiCommentiRun` / `runCardAI` / `runCardQ` non lasciano log lato
client.

## 6. Chiudere la richiesta

- Verifica che `users/{uid}` non esista più e che una ricerca del displayName nelle card
  non restituisca voci residue.
- Rispondi al richiedente entro un mese (art. 12 GDPR) indicando cosa è stato cancellato e
  cosa è stato anonimizzato, e perché (interesse legittimo alla conservazione del
  materiale didattico condiviso).
- Segna nel promemoria la data e il tipo di intervento, senza riportare il nome.

## Note

- **Non** cancellare `cards` del docente né i file in `cards/{id}/allegati`: sono dati
  dell'Istituto, non dello studente.
- Le Rules non permettono allo studente di cancellare il proprio `users/{uid}`? In realtà
  `allow delete: if isAuth() && request.auth.uid == uid` lo consente: se lo fa da solo,
  i punti 2 e 3 restano comunque da eseguire a mano, perché i dati sparsi nelle card non
  si cancellano con il profilo.
- Questa procedura è manuale di proposito: una cancellazione automatica su richiesta
  potrebbe essere invocata per errore (o da un account compromesso) e non è reversibile.
