# COSE IN SOSPESO

Aggiornato al **11/10/2026**. **Una sola cosa da fare, tua**: pubblicare le
Rules di `allegati_consegne` in Firebase Console. Il controllo Safari che era in
lista è stato eseguito ed è verde.
Stato del repository: `main` in sync con `origin/main`, working tree pulito,
**987 test verdi (exit 0)** + **8 E2E su WebKit verdi**, `tsc --noEmit` pulito,
eslint senza warning.

Questo file elenca ciò che è **noto e non fatto**. Non è un piano di lavoro: è
l'elenco delle cose che si sanno e che si è deciso di non fare subito, con la
ragione accanto. Se una voce non è più valida va cancellata, non spostata.

---

## 1. Non c'è più nulla che blocca

### ✅ Regole Firestore — llegati_consegne pubblicata (11/10/2026)

La raccolta degli allegati completati ha la sua regola in ules firestore.txt ed
è stata **pubblicata** in Firebase Console → Firestore → Rules. La consegna
dell'allegato viene registrata e allo studente non viene più riproposto.

### ✅ Regole Firestore — classiEscluse pubblicata (11/10/2026)
### ✅ Regole Firestore — `classiEscluse` pubblicata (11/10/2026)

La regola che vieta allo studente di scrivere `classiEscluse` è in
`rules firestore.txt` (blocco `create` della collection `cards`) ed è stata
**pubblicata** in Firebase Console → Firestore → Rules.

Una proposta dello studente non può più portarsi dietro esclusioni di classe:
il buco che la regola chiude è chiuso.

**Da ricordare ogni volta** (non è una voce di questo elenco, è il fatto
operativo che l'ha generata): un cambio a `rules firestore.txt` **non vale**
finché non lo pubblichi a mano. Il file, la CI e i test possono essere tutti
verdi con le Rules in produzione diverse da quelle del repository.

---

## 2. Deciso di non fare ora (con la ragione)

### ✅ I colori con `var()` negli attributi SVG — verificato su WebKit (11/10/2026)

I colori inline sono passati da valori scritti a mano a `var(--token, valore)`
in modo che il tema chiaro li governi. In **tema scuro** il risultato è
identico per costruzione (il fallback è il valore di prima) e
`token-coerenti.test.ts` lo verifica su ogni occorrenza.

Il caso aperto era lo **scheletro di caricamento** (`CardGrid.tsx`): lì i colori
non sono in uno stile ma in attributi di presentazione SVG (`fill="…"`), dove
`var()` *dovrebbe* funzionare perché la specifica li tratta come dichiarazioni
CSS.

**Chiuso**: verificato a mano su Chromium e poi sul motore di Safari, con
`npx playwright install webkit` e poi `npx playwright test --project=webkit`
(8 test verdi, guardia `e2e/colori-webkit.spec.js` inclusa). Su WebKit
`fill="rgba(var(--c-primary-rgb),.5)"` rende come il valore scritto a mano e il
fallback funziona: nessun difetto.

Nota per il futuro: WebKit ora è installato **in locale**, quindi le guardie
webkit si eseguono senza setup. Prima non lo era, ed era una voce aperta da due
sessioni.

### ~~P2 — `noUncheckedIndexedAccess` + tipo `Card`~~ → **fatto l'11/10/2026**

Il tipo `Card` esiste (`src/card-tipo.ts`) ed è applicato dove rende valore
immediatamente verificabile: `card-classi.ts` (tutte le funzioni) e i costruttori
puri di `app-provider-helpers.ts` (`buildNewCard`, `buildEditCard`,
`buildDuplicaCopia`, `buildCopiaAnno`). `src/card-tipo.test.ts` impedisce che il
tipo e le Rules divergano.

**Non è fatto, e non è previsto**: `noUncheckedIndexedAccess` (toccherebbe 36
accessi per indice) e la migrazione del resto dell'app da `any` a `Card` (il `db`
arriva da `window.db`: è un rifacimento da fare per gruppi, non in un colpo). Il
tipo è il **contratto dichiarato**, non un codice migrato.

### P3 — `limit()` sulle query Firestore

Non fatto, e **la proposta va rivista prima di eseguirla**. Motivo: oggi il
dataset lo regge e un tetto non porta benefici. Ma un tetto rigido, se un domani
la scuola supera la soglia, fa **scomparire card dalla griglia senza dire nulla** —
che è lo stesso difetto della regola 14 di `AGENTS.md` (un errore non cancella
dati già mostrati). Se un giorno serve, la forma giusta è **paginazione con
indicatore visibile**, non un `limit()` silenzioso.

---

## 3. Limiti noti degli strumenti che ho costruito (onesti, non bug)

### L'analizzatore di `.then(` non vede le promise "floating"

`src/promise-catch.test.ts` + `src/promise-utils.ts` trovano le catene `.then(`
senza gestore. **Non** trovano le promise nate da una **chiamata a funzione**
ignorata: `writeLista(x);` dentro un `.catch` resta invisibile all'analizzatore.
Quello l'ho corretto a mano nel caso reale (è il motivo per cui `useNotifiche.ts`
ha il catch commentato), ma la classe di difetto resta coperta solo da review e
test di integrazione, non dal presidio automatico.

### Le `ESCLUSIONI` sono dichiarazioni, non verifiche automatiche

Le 3 esclusioni in `promise-utils.ts` sono ciascuna un atto di fiducia motivato
nel commento. Il test verifica che **non diventino obsolete** (se la riga sparisce,
la voce viene segnalata come inutile), ma **non verifica che il motivo sia ancora
vero**: se `emailAutorizzataConReload` un domani smette di catturare gli errori,
l'esclusione resta valida e il presidio non lo vede. È il residuo accettato di
un controllo statico.

### `npm run test:budget` è un cruscotto, non un gate

Va eseguito **a mano**, mai in CI: sotto carico la suite può essere rossa di
proposito (è il suo scopo). Serve a trovare i flake prima che scattino, non a
bloccare la build.

---

## 4. Cose che NON saprei fare senza di te

- **Ripubblicare le rules**: serve l'accesso alla Console. L'ultima volta è
  stata fatta (11/10/2026, `classiEscluse`); quella delle `allegati_consegne` è
  ancora da fare. La prossima sarà ogni volta che si tocca `rules firestore.txt`.
- **Il bundle da 1083 KB** (vendor-firebase 606 KB): si può valutare un import
  selettivo di Firebase, ma è un intervento che tocca l'inizializzazione
  dell'app — da fare con calma, non di corsa.
- **E2E su WebKit in locale**: serve `npx playwright install webkit`.

---

## 5. Regola per le cose in sospeso

Una voce esce da questo file solo in uno di due modi:

1. **è stata fatta** (commit con messaggio in italiano, convenzionale);
2. **è stata ri-dichiarata qui sotto con una nuova data e un motivo nuovo** —
   cioè una decisione consapevole di rimandare, non un oblio.

Se una voce è qui da due sessioni e nessuno l'ha toccata, o si fa o si cancella:
le voci che invecchiano isteriliscono l'elenco e fanno perdere fiducia a chi lo legge.
