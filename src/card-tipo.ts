// card-tipo.ts · ScuolaBoard · IL CONTRATTO DEL DOCUMENTO `cards/{id}`.
//
// ── Perché esiste ────────────────────────────────────────────────────────
// Il documento card è letto in ~30 file e finora era `any` ovunque: un
// refactor poteva rinominare un campo e il compilatore non diceva niente,
// il difetto emergeva a runtime (o peggio, in silenzio — vedi la regola 14
// di AGENTS.md: un errore non deve far sparire dati già mostrati).
//
// Questo file NON è un trucco per fare Content con `any`: è il posto dove
// mettere i campi NUOVI e dove dichiarare i campi esistenti. Va letto
// insieme a `rules firestore.txt`: le regole dicono chi può scrivere cosa,
// questo tipo dice che cosa esiste.
//
// ── Come usarlo (e quando non farlo) ─────────────────────────────────────
//  - Le funzioni PURE che costruiscono o filtrano card devono dichiarare
//    `card: Card`: sono il punto dove il documento è definito, e sono
//    verificabili senza toccare nulla.
//  - Il resto dell'app continua a ricevere `any` da Firestore (db arriva
//    da window.db): migrare tutto in un colpo solo sarebbe un rifacimento
//    senza rete di sicurezza. Qui si fissa il CONTRATTO, non si pretende
//    di aver migrato il codice.
//  - I campi che tornano da Firestore possono mancare (doc legacy, create
//    condizionali): per questo quasi tutto è opzionale anche quando la
//    creazione lo scrive sempre. La creazione garantisce i campi, la
//    LETTURA no.

// ── Sotto-tipi ────────────────────────────────────────────────────────────

/** Un link della card. `url` passa da `sbSafeUrl` (http/https soltanto). */
export type CardLink = { url: string; label?: string };

/** Immagine: forma nuova (oggetto) o legacy (stringa URL). I lettori
 *  gestiscono entrambe (retrocompatibilità, vedi CardDetail). */
export type CardImmagine = { id?: string; url: string; didascalia?: string } | string;

/** Allegato: `url` è una data URL base64 dentro il documento (non c'è
 *  Storage). `any[]` in tutto il resto del codice, per scelta storica. */
export type CardAllegato = { id?: string; name?: string; type?: string; size?: number; url: string };

/** Opzione di sondaggio. `voti` sono i NOMI di chi ha votato, non id. */
export type CardOpzione = { id?: string; testo: string; voti?: string[] };

/**
 * Domanda di quiz. `corretta` cambia SIGNIFICATO a seconda di `tipo`:
 * per `multipla` è l'INDICE come stringa (`'0'` = prima opzione, 0-based),
 * per `verofalso` è il TESTO (`'Vero'`/`'Falso'`), per `aperta` non c'è.
 * Il criterio unico di risposta giusta è `src/quiz-corretta.ts`: non
 * confrontare `corretta` a mano da un altro file.
 *
 * `ai: true` significa "contenuto generato dall'IA": lo mette SOLO
 * `aiConfirmaQuiz` (regola 3 di AGENTS.md, privacy/trasparenza). Le
 * domande importate da file NON lo hanno: dichiararlo sarebbe falso.
 */
export type QuizDomanda = {
  tipo?: 'multipla' | 'verofalso' | 'aperta';
  testo: string;
  opzioni?: any[];
  /** indice 0-based COME STRINGA per `multipla`, testo per `verofalso`. */
  corretta?: string;
  hint?: string;
  rationale?: string;
  /** Marchio IA. Non spostarlo in UI: si perde copiando la card. */
  ai?: boolean;
};

/** Commento (o risposta) della card. */
export type CardCommento = {
  id?: any;
  autore?: string;
  testo?: string;
  data?: any;
  risposte?: CardCommento[];
  /** Emoji → nomi di chi ha reagito. */
  reazioni?: Record<string, string[]>;
  modificato?: boolean;
};

/** Chi non ha ricevuto l'avviso di classe. CONTIENE NOMI DI STUDENTI:
 *  sta in un documento leggibile dagli studenti (vedi regola 11 di
 *  AGENTS.md); se un giorno la si vuole togliere, tenere qui i soli
 *  `uid` e risolvere i nomi lato docente. */
export type AvvisoMancante = { uid: string; nome: string };

// ── Il documento ──────────────────────────────────────────────────────────

/**
 * Il documento `cards/{id}`.
 *
 * I campi con commento «sempre in creazione» sono scritti da `buildNewCard`
 * per ogni card. Sono comunque opzionali nel tipo: una card precedente al
 * campo, o creata da un percorso diverso, non li ha, e la LETTURA non deve
 * poter fidarsi che ci siano (è la differenza fra "la creazione garantisce
 * i campi" e "la lettura no").
 */
export type Card = {
  /** Id numerico (creazione) o stringa (duplica/copia-anno). Usare
   *  `String(card.id)` per il docId: i due non coincidono. */
  id?: string | number;

  // ── Contenuto ─────────────────────────────────────────────────────────
  /** `avviso`, `sondaggio`, `quiz`, `proposta`, … */
  tipo?: string;
  titolo?: string;
  testo?: string;
  /** Data di pubblicazione, `YYYY-MM-DD`. */
  data?: string;
  /** Nome visualizzato di chi l'ha creata (non l'uid). */
  autore?: string;
  /** Scadenza (ISO) per le card con allarme. */
  scadenza?: string | null;

  // ── Destinatari ───────────────────────────────────────────────────────
  /** `['TUTTE']` = tutte le classi (segnaposto, non elenco). `[]` = solo
   *  prof. L'elenco vero è qui. Il criterio UNICO di visibilità è
   *  `card-classi.ts`, non un `indexOf` sparso: vedi quel modulo. */
  classi?: string[];
  /** Esclusioni per classe. Assente = nessuna. Vedi `card-classi.ts` per
   *  perché esiste invece di riscrivere `classi`. */
  classiEscluse?: string[];
  /** Anno scolastico (`CFG.ANNI_DISPONIBILI`). */
  annoScolastico?: string;

  // ── Visibilità e stato ────────────────────────────────────────────────
  /** `true` solo dopo l'approvazione. Una proposta dello studente NON lo
   *  ha in creazione (le rules lo vietano): per questo la proposta resta
   *  invisibile ai compagni per costruzione. */
  visibile?: boolean;
  /** TRI-STATO, non un boolean: assente = card del prof, `true` = proposta
   *  in attesa, `false` = approvata, `'rifiutata'` = respinta con
   *  motivazione. I filtri usano `=== true` o `!c.proposta`. */
  proposta?: boolean | 'rifiutata';
  motivazioneRifiuto?: string;
  /** Fissata: sempre davanti a tutte, per TUTTI (campo sul documento). */
  pinned?: boolean;
  /** Ordine manuale (drag & drop del prof). */
  ordine?: number;

  // ── Contenuto multimediale ────────────────────────────────────────────
  links?: CardLink[];
  /** Legacy: letto come fallback, più non scritto. */
  linkEsterno?: string;
  immagini?: CardImmagine[];
  /** Data URL base64, o `null`. */
  copertina?: string | null;
  /** Vietato allo studente dalle rules (non possono guardare dentro un
   *  base64: l'unica difesa possibile è binaria). */
  allegati?: CardAllegato[];

  // ── Sondaggio e quiz ──────────────────────────────────────────────────
  opzioni?: CardOpzione[];
  quizDomande?: QuizDomanda[];
  /** Minuti. Condizionale a `tipo === 'quiz'`. */
  quizTimer?: number;

  // ── Partecipazione ────────────────────────────────────────────────────
  commenti?: CardCommento[];
  likes?: number;
  likesBy?: string[];
  /** Emoji → nomi di chi ha reagito. */
  reazioni?: Record<string, string[]>;
  /** Nell'allowlist delle rules ma non letto da `src/`: residuo storico. */
  visto?: boolean;

  // ── Coda d'annuncio alla classe ───────────────────────────────────────
  /** Finché `true` il docente vede il badge "AVVISO NON INVIATO" e la
   *  card è recuperabile alla prossima apertura. TUTTA la logica sta in
   *  `src/avvisi-classe.ts`: non scrivere questi campi a mano. */
  avvisiPendenti?: boolean;
  /** Istante in cui è entrata in coda (`Date.now()`): la finestra di
   *  recupero parte da qui, non dalla creazione. */
  avvisiDaMs?: number | null;
  avvisiMancanti?: AvvisoMancante[] | null;

  // ── Contenuto IA ──────────────────────────────────────────────────────
  aiAnalisi?: any | null;
  aiDomandePubbliche?: { id?: string; q?: string; risposta?: string; data?: any }[];

  // ── NOTA: niente firma indice ──────────────────────────────────────────
  // Dichiarare `[campo: string]: any` qui sembrerebbe comodo ("il documento
  // può avere campi che il client non conosce") ma renderebbe il tipo
  // INUTILE: ogni lettura di un campo inesistente diventerebbe `any`
  // senza errore, cioè esattamente il difetto che questo tipo deve
  // eliminare. Firestore accetta campi extra, ma non li LEGGE il codice:
  // se un domani il client ne usa uno, va dichiarato qui, e `tsc` lo
  // chiederà. Meglio un errore in compilazione che un `undefined` in
  // produzione.
};

/**
 * Campi che lo studente NON può scrivere in `create` (regole Firestore).
 * Qui per documentazione e per il test di coerenza: se una regola cambia,
 * la lista va aggiornata insieme. Le regole sono la verità; questo è
 * l'eco.
 */
export const CAMPI_VIETATI_ALLO_STUDENTE_CREATE = [
  'likes',
  'likesBy',
  'reazioni',
  'visibile',
  'pinned',
  'aiAnalisi',
  'aiDomandePubbliche',
  'classiEscluse',
];