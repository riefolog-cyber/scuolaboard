# 🎓 ScuolaBoard

Bacheca digitale interattiva con AI per la classe, pensata per insegnanti e studenti.  
Costruita con **React**, **Firebase** (Firestore + Auth Google) e integrazione **AI via OpenRouter**.

---

## ✨ Funzionalità

- 📌 **Card** — pubblica domande, note e sondaggi per la classe
- 🗳️ **Sondaggi interattivi** — gli studenti votano in tempo reale
- 💬 **Commenti** — discussione sotto ogni card
- 👍 **Like** — gli studenti possono apprezzare i contenuti
- ⏳ **Moderazione** — le proposte degli studenti vengono approvate dal prof
- 🤖 **Analisi AI** — sintesi e spunti didattici generati da AI
- 📥 **Export CSV** — scarica i dati della bacheca
- ◆ **QR Code** — condividi l'app con gli studenti in un click
- 🏷️ **Tag e filtri** — organizza i contenuti per categoria

---

## 🚀 Come usare l'app

L'app è un **singolo file HTML** — nessuna installazione richiesta.

1. Apri il file nel browser oppure accedi tramite GitHub Pages
2. Accedi con il tuo **account Google**
3. Al primo accesso il ruolo è `studente` — vedi sotto come diventare Prof

---

## 🔧 Configurazione Firebase

Per usare questa app con il tuo Firebase:

1. Crea un progetto su [firebase.google.com](https://firebase.google.com)
2. Abilita **Firestore** e **Authentication → Google**
3. Copia le credenziali del progetto nel file HTML (sezione `firebase.initializeApp`)
4. Nella Google Cloud Console, aggiungi il tuo dominio GitHub Pages tra i referrer autorizzati della chiave API

---

## 👨‍🏫 Come diventare Professore

Al primo accesso Google il ruolo è impostato automaticamente a `studente`.  
Per promuovere un account a `prof`:

1. Vai su **Firebase Console → Firestore → collezione `users`**
2. Trova il documento con la tua email
3. Modifica il campo `role` da `"studente"` a `"prof"`
4. Salva, poi fai **logout e login** nell'app

---

## 🤖 Funzione AI (OpenRouter)

L'analisi AI usa modelli gratuiti tramite [OpenRouter](https://openrouter.ai).

1. Registrati gratuitamente su **openrouter.ai** (no carta di credito)
2. Genera una chiave API (`sk-or-…`)
3. Nell'app clicca il tasto **⚠️** in alto a destra e incolla la chiave
4. La chiave è salvata solo nella sessione corrente (non nel database)

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

- I dati sono salvati su **Firebase Firestore** — nessun dato viene perso aggiornando il file HTML
- Per resettare la bacheca: tasto 🗑️ in alto a destra (solo prof)
- GitHub Pages richiede repository pubblico per funzionare nel piano gratuito

---

*Progetto sviluppato per uso didattico in classe — Religione, scuola secondaria di secondo grado.*
