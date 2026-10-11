# COSE IN SOSPESO

Aggiornato al **11/10/2026**, dopo il commit `a628ef1`.
Stato del repository al momento della stesura: `main` in sync con `origin/main`,
working tree pulito, **932 test verdi (exit 0)**, `tsc --noEmit` pulito, eslint
senza warning.

Questo file elenca ciò che è **noto e non fatto**. Non è un piano di lavoro: è
l'elenco delle cose che si sanno e che si è deciso di non fare subito, con la
ragione accanto. Se una voce non è più valida va cancellata, non spostata.

---

## 1. In attesa di una tua conferma (l'unica cosa che blocca davvero)

### 🔴 Regole Firestore — `classiEscluse` va pubblicata a mano

La regola che vieta allo studente di scrivere `classiEscluse` è **nel file**
(`rules firestore.txt:153`), dentro il blocco `create` della collection `cards`:

```
&& !request.resource.data.keys().hasAny([... 'classiEscluse'])
```

ma **non è stata pubblicata in Firebase Console** → Firestore → Rules.

Finché non la pubblichi, in produzione uno studente potrebbe inviare una proposta
con `classiEscluse` e nascondere la card ad altre classi: è esattamente la
banda che la regola chiude. Il resto del comportamento (l'eliminazione per
singola classe) funziona comunque, perché lì il campo lo scrive solo il docente.

**Come fare:** Firebase Console → Firestore → Rules → incolla il contenuto di
`rules firestore.txt` → Publish.

⚠️ È l'unica azione di questo elenco che **non** si può né delegare né
dimenticare: un cambio alle rules senza pubblicazione è un cambio incompleto.

---

## 2. Deciso di non fare ora (con la ragione)

### P2 — `noUncheckedIndexedAccess` + tipo `Card`

Non fatto. Motivo: 1256 occorrenze di `any` nel codice di produzione, e il flag
toccherebbe 36 accessi per indice. È lavoro da fare **per gruppi**, non in un colpo
solo, e il valore vero sta nel **tipo `Card`** (trasformerebbe ~42 letture `any`
in un contratto verificato da `tsc`).

Quando farlo: **solo se stai già toccando quelle zone per un altro motivo**, non
come campagna. `tsconfig.json` oggi ha solo `"strict": true`.

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

- **Ripubblicare le rules** (punto 1): serve l'accesso alla Console.
- **Decidere se P2 vale il costo**: è una decisione di progetto, non tecnica.
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