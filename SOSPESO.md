# COSE IN SOSPESO

Aggiornato al **11/10/2026**: le Rules Firestore (campo `classiEscluse`) sono
state pubblicate in Firebase Console. **Non c'è più nulla che blocchi.**
Stato del repository: `main` in sync con `origin/main`, working tree pulito,
**941 test verdi (exit 0)**, `tsc --noEmit` pulito, eslint senza warning.

Questo file elenca ciò che è **noto e non fatto**. Non è un piano di lavoro: è
l'elenco delle cose che si sanno e che si è deciso di non fare subito, con la
ragione accanto. Se una voce non è più valida va cancellata, non spostata.

---

## 1. Nessuna attesa: non c'è più nulla che blocchi

### ✅ Regole Firestore — `classiEscluse` pubblicata (11/10/2026)

La regola che vieta allo studente di scrivere `classiEscluse` è in
`rules firestore.txt:153` (blocco `create` della collection `cards`) ed è stata
**pubblicata in Firebase Console** → Firestore → Rules.

Una proposta dello studente non può più portarsi dietro esclusioni di classe:
il buco che la regola chiude è chiuso.

**Da ricordare ogni volta** (non è una voce di questo elenco, è il fatto
operativo che l'ha generata): un cambio a `rules firestore.txt` **non vale**
finché non lo pubblichi a mano. Il file, la CI e i test possono essere tutti
verdi con le Rules in produzione diverse da quelle del repository.

---

## 2. Deciso di non fare ora (con la ragione)

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
  stata fatta (11/10/2026, `classiEscluse`); la prossima sarà ogni volta che si
  tocca `rules firestore.txt`.
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