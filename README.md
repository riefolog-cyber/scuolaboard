[readme webapp.txt](https://github.com/user-attachments/files/29098265/readme.webapp.txt)
# 🎓 ScuolaBoard

Bacheca digitale interattiva con AI per la classe, pensata per insegnanti e studenti.  
Costruita con **React**, **Firebase** (Firestore + Auth) e integrazione **AI via OpenRouter**.

---

## ✨ Funzionalità

- 📌 **Card** — pubblica domande, note e sondaggi per la classe
- 💬 **Commenti** — discussione sotto ogni card
- 👍 **Like** — gli studenti possono apprezzare i contenuti
- ⏳ **Moderazione** — le proposte degli studenti vengono approvate dal prof
- 🤖 **Analisi AI** — sintesi e spunti didattici generati da AI (OpenRouter)
- ◆ **QR Code** — condividi l'app con gli studenti in un click

---

## 🚀 Come usare l'app

L'app è un **singolo file HTML** — nessuna installazione richiesta.

1. Apri il file `scuolaboard.html` nel browser oppure visita la versione su GitHub Pages
2. Accedi con il tuo **account Google**
3. Al primo accesso il ruolo è `studente` — vedi sotto come diventare Prof

---

## 🔧 Configurazione Firebase

Il progetto usa Firebase con queste credenziali (già incluse nel file HTML):

| Parametro | Valore |
|---|---|
| Project ID | `scuolaboard-874d4` |
| Auth Domain | `scuolaboard-874d4.firebaseapp.com` |
| App ID | `1:249372381209:web:737697d4d10b3ae06eda88` |

### Domini autorizzati nella chiave API
Nella [Google Cloud Console](https://console.cloud.google.com/apis/credentials?project=scuolaboard-874d4) assicurati che la chiave API abbia questi referrer autorizzati:
```
https://scuolaboard-874d4.firebaseapp.com/*
https://scuolaboard-874d4.web.app/*
https://riefolog-cyber.github.io/*
http://localhost/*
```

---

## 👨‍🏫 Come diventare Professore

Al primo accesso Google il ruolo è impostato automaticamente a `studente`.  
Per promuovere un account a `prof`:

1. Vai su [Firebase Console → Firestore](https://console.firebase.google.com/project/scuolaboard-874d4/firestore/databases/-default-/data)
2. Apri la collezione **`users`**
3. Trova il documento con la tua email (puoi cercare l'UID su [Authentication](https://console.firebase.google.com/project/scuolaboard-874d4/authentication/users))
4. Modifica il campo `role` da `"studente"` a `"prof"`
5. Salva, poi fai **logout e login** nell'app

---

## 🤖 Funzione AI (OpenRouter)

L'analisi AI usa modelli gratuiti tramite [OpenRouter](https://openrouter.ai).

1. Registrati gratuitamente su **openrouter.ai** (no carta di credito)
2. Genera una chiave API (`sk-or-…`)
3. Nell'app clicca il tasto **⚠️** in alto a destra e incolla la chiave
4. La chiave è salvata solo nella sessione corrente (non nel database)

Modelli usati (gratuiti, a rotazione automatica):
- `meta-llama/llama-3.2-3b-instruct:free`
- `google/gemma-3-1b-it:free`

---

## 🗂️ Struttura Firestore

```
/cards/{cardId}
  - id, tipo, titolo, testo
  - autore, data, colore
  - tags[], likes, ordine
  - commenti[]
  - opzioni[] (solo sondaggi)
  - youtube (opzionale)
  - proposta (true = in attesa di approvazione)

/users/{uid}
  - nome, cognome, email
  - role: "prof" | "studente"
  - provider, lastLogin
```

---

## 🛠️ Tecnologie usate

| Tecnologia | Uso |
|---|---|
| React 18 (UMD) | Interfaccia utente |
| Firebase 10 | Database (Firestore) + Auth Google |
| OpenRouter API | Analisi AI con modelli gratuiti |
| QR Server API | Generazione QR code |

---

## 📋 Note

- I dati sono salvati su **Firebase Firestore** — nessun dato viene perso cambiando versione del file HTML
- L'app funziona anche aprendo il file **direttamente nel browser** (file://) se i domini sono configurati correttamente
- Per resettare la bacheca: tasto 🗑️ in alto a destra (solo prof)

---

*Progetto sviluppato per uso didattico in classe — Religione, scuola secondaria di secondo grado.*
