# Analisi di Conformità di ScuolaBoard al Regolamento IA d'Istituto

**Applicazione esaminata:** [ScuolaBoard (riefolog-cyber/scuolaboard)](https://github.com/riefolog-cyber/scuolaboard)  
**Riferimenti normativi e regolamentari:**
* *Regolamento per l'uso dei Sistemi di Intelligenza Artificiale in ambito scolastico d'Istituto* (e relativi Allegati A, B, B2, C, D)
* *AI Act (Regolamento UE 2024/1689)*
* *GDPR (Regolamento UE 2016/679)*
* *Linee Guida del Ministero dell'Istruzione e del Merito (MIM)*

---

## 1. Quadro Generale e Architettura dell'Applicazione

ScuolaBoard è una Progressive Web App (PWA) didattica sviluppata in React e TypeScript, progettata per la gestione delle attività di classe (bacheca lezioni, avvisi, quiz interattivi, discussioni/commenti, alzata di mano e sondaggi).

### Componenti Chiave del Flusso IA:
* **Interfaccia e Client:** Frontend eseguito nel browser con persistenza su Firebase Firestore.
* **Autenticazione:** Firebase Auth con Google Sign-In.
* **Backend IA (Proxy Sicuro):** Cloudflare Worker serverless (`scuolaboard-groq-proxy.scuolaboard.workers.dev`) che protegge le chiavi API e valida i token di sessione (Firebase ID Token).
* **Motore LLM:** Modelli open source (Llama) serviti tramite l'infrastruttura API di Groq.
* **Funzionalità IA:**
  1. *Spiegazione e riassunto lezioni* per facilitare lo studio degli studenti.
  2. *Q&A Didattico* su richiesta del docente.
  3. *Generazione di bozze di quiz didattici* (scelta multipla / vero-falso).
  4. *Analisi pedagogica aggregata dei sondaggi*.
  5. *Sommario tematico delle discussioni e dei commenti* degli studenti.

---

## 2. Valutazione di Conformità al Regolamento d'Istituto

###  Punti di Forza (Già Conformi)

1. **Supervisione Umana e Assenza di Decisioni Automatizzate (*Human-in-the-loop*, Art. 4, Art. 5 c.4, Art. 7 c.3):**
   * L'IA non attribuisce voti o giudizi docimologici automatici.
   * La generazione dei quiz (`aiGenerateQuiz`) produce un'anteprima che il docente deve obbligatoriamente revisionare, modificare e approvare esplicitamente (`aiConfirmaQuiz`) prima della somministrazione alla classe.
2. **Sicurezza e Protezione delle Chiavi API:**
   * Le chiamate non espongono credenziali o token nel client frontend; transitano attraverso un proxy autenticato con rate-limiting (`AI_THROTTLE_MS = 5000`).
3. **Difesa da Prompt Injection (Art. 7):**
   * L'app adotta l'incapsulamento dei contenuti utente entro delimitatori rigidi (`<USER_DATA>`) con istruzioni di sistema che impediscono la sovrascrittura delle direttive didattiche.
4. **Finalità Didattiche e Inclusione (Art. 4 c.6 - BES/DSA):**
   * Le funzioni di supporto alla spiegazione e di sintesi rientrano tra gli usi didattici e compensativi promossi dal Regolamento.

---

### ⚠️ Aree da Adeguare / Regolarizzare

| Aspetto | Stato Attuale | Requisito Regolamentare | Azione Necessaria |
| :--- | :--- | :--- | :--- |
| **White-List d'Istituto** | Groq / Cloudflare non presenti in Allegato B. | Art. 7 c.2: ammessi solo strumenti approvati. | Compilare e trasmettere l'**Allegato B2** al Team IA e DPO per l'inserimento ufficiale. |
| **Account e Dominio** | Google Sign-in aperto a qualsiasi account `@gmail.com`. | Art. 6 c.1: utilizzo prioritario di account del Workspace protetto. | Restringere il login al dominio scuola `@scuola.edu.it`, mantenendo la whitelist per l'account personale del docente. |
| **Privacy Commenti Studenti** | Nei prompt di riassunto commenti venivano inviati i nomi degli studenti all'API. | Art. 5 c.3, Art. 6 c.3 e GDPR (minori). | Attivare la **pseudonimizzazione locale** prima dell'invio all'IA. |
| **Informativa Privacy** | `PrivacyModal` con testo sintetico generico. | Art. 6 c.1 e Allegato A (Patto di Corresponsabilità). | Aggiornare il testo della modale con il richiamo all'Informativa d'Istituto. |
| **Trasparenza IA** | Materiali generati privi di etichetta esplicita. | Art. 4 c.8 e AI Act Art. 50. | Inserire un badge visibile: *"Supporto IA, revisionato dal docente"*. |

---

## 3. Soluzioni Tecniche e Operative Adottate

### A. Pseudonimizzazione Locale dei Commenti (Client-Side Anonymization)
**Problema:** Come permettere all'IA di fare il riassunto della discussione senza inviare i dati personali dei minori a server esterni, ma consentendo al docente di leggere chiaramente chi ha detto cosa?

**Soluzione:** Il browser esegue una mappatura temporanea in memoria:
1. **Prima dell'invio:** `Mario Rossi` $\rightarrow$ `Studente 1`, `Giulia Bianchi` $\rightarrow$ `Studente 2`.
2. **Durante la chiamata:** All'API di Groq arrivano solo etichette anonime (`Studente 1`, `Studente 2`).
3. **Alla ricezione della risposta:** Il codice JavaScript di ScuolaBoard sostituisce automaticamente le etichette con i nomi reali.
4. **Risultato:** Il docente legge a schermo i nomi veri; l'IA esterna non riceve alcun dato personale. Pienamente conforme all'**Art. 4, par. 5 del GDPR**.

```typescript
// Implementazione in src/ai-services.ts
async function riassuntiCommentiRun(card: any) {
  var commenti = card.commenti || [];
  if (commenti.length < 2) return;
  setSommarioLoading(card.id);

  var mappaNomi: Record<string, string> = {};
  var elencoAutoriUnici: string[] = [];

  var txt = commenti.map(function (c: any) {
    var autoreReale = c.autore || 'Anonimo';
    var idx = elencoAutoriUnici.indexOf(autoreReale);
    if (idx === -1) {
      elencoAutoriUnici.push(autoreReale);
      idx = elencoAutoriUnici.length;
    } else {
      idx = idx + 1;
    }
    var alias = 'Studente ' + idx;
    mappaNomi[alias] = autoreReale;
    return alias + ': ' + SB.escapeForPrompt(c.testo);
  }).join('\n');

  var prompt =
    'Riassumi questa discussione per punti chiave e contributi degli studenti. ' +
    'Fai riferimento agli studenti con i loro identificativi (es. Studente 1, Studente 2).\n\n' +
    '<USER_DATA>\n' + txt + '\n</USER_DATA>';

  try {
    var res = await _callGroqText(null, prompt, 600);
    var testoConNomiReali = res;
    Object.keys(mappaNomi).forEach(function (alias) {
      var regex = new RegExp('\\b' + alias + '\\b', 'g');
      testoConNomiReali = testoConNomiReali.replace(regex, mappaNomi[alias]);
    });
    setSommarioResult(p => ({ ...p, [card.id]: testoConNomiReali }));
  } catch (e: any) {
    setSommarioResult(p => ({ ...p, [card.id]: 'Errore: ' + e.message }));
  } finally {
    setSommarioLoading(null);
  }
}
```

---

### B. Gestione Google Sign-In a "Doppio Binario"
**Problema:** Gli studenti devono entrare solo con l'account della scuola (`@scuola.edu.it`), ma il docente usa un proprio account Gmail personale (`@gmail.com`).

**Soluzione:** Verifica immediata post-autenticazione:
* **Studenti:** ammessi se l'email termina con il dominio istituzionale.
* **Docente:** ammesso se l'email è inclusa nella lista esplicita autorizzata (*Whitelist*).
* **Altri account personali:** disconnessi all'istante con notifica di divieto d'accesso.

```typescript
// Implementazione in src/auth.ts
var DOMINIO_SCUOLA = '@istituto.edu.it'; // Sostituire con il dominio reale della scuola
var DOCENTI_WHITELIST = ['email.personale.prof@gmail.com']; // Inserire la propria email personale

function isEmailAutorizzata(email: string | null | undefined): boolean {
  if (!email) return false;
  var em = email.toLowerCase().trim();
  if (em.endsWith(DOMINIO_SCUOLA.toLowerCase())) return true;
  if (DOCENTI_WHITELIST.map(d => d.toLowerCase()).includes(em)) return true;
  return false;
}
```

---

## 4. Prossimi Passi Amministrativi (Iter Istituzionale)

1. **Compilazione Modulo Allegato B2:**
   * *Denominazione strumento:* ScuolaBoard (PWA didattica con modulo IA Groq / Llama).
   * *Finalità:* Supporto alla didattica digitale, generazione quiz formativi, sintesi discussioni e facilitazione dell'apprendimento.
   * *Presidi di sicurezza dichiarati:* Proxy serverless protetto, pseudonimizzazione client-side dei dati, assenza di profilazione o valutazione automatizzata, validazione umana costante da parte del docente.
2. **Trasmissione al Team Governance IA e al DPO d'Istituto.**
3. **Informativa alle Famiglie (Allegato A):** Verificare la raccolta del Patto di Corresponsabilità all'inizio dell'anno scolastico.
