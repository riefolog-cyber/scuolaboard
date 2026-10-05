// quiz-import.ts · ScuolaBoard · importazione di quiz da JSON (o da HTML che contiene
// il JSON dentro uno <script>).
//
// Perché esiste: i file .html che si allegano alla bacheca contengono già i dati del
// quiz in chiaro (`const quizData = [...]`), ma sono file MORTI: si vedono e si
// possono fare, però le risposte non arrivano da nessuna parte (niente punteggio,
// niente classifica, niente valutazione IA). Copiando quei dati in un quiz NATIVO
// della card si ottiene tutto il resto senza riscrivere nulla.
//
// Formati accettati (l'unico posto che li conosce: qui).
//   1. Array di domande:            [{question, options:[…], …}, …]
//   2. Oggetto con lista:           {domande: […]} | {questions: […]} | {quiz: […]}
//   3. HTML con array JSON dentro:  <script>…quizData = [ … ]…</script>
//                                  (è il formato del file segnalato dall'utente)
//
// Campi riconosciuti per domanda: testo|question|domanda|testo_domanda, opzioni|options,
// hint|suggerimento, rationale|motivo|spiegazione. Risposta corretta: opzione con
// `isCorrect`/`corretta`/`correct` true, oppure campo `corretta`/`correctIndex` come
// indice o come testo dell'opzione.
//
// MODULO PURO: nessuna React, nessun DOM, nessun file. Il badge "🤖 Supporto IA" NON
// viene messo: un quiz importato non è generato dall'IA, e dichiararlo sarebbe falso.

export type EsitoImport = {
  domande: any[];
  // Motivo per cui una domanda è stata scartata. Nessun silenzio: se ne perdono 3 su
  // 12, l'insegnante deve saperlo (l'import è una decisione, non un automatismo).
  scartate: { indice: number; motivo: string }[];
  totaleLetture: number;
  errore?: string;
};

var CAMPI_TESTO = ['testo', 'question', 'domanda', 'testo_domanda', 'titolo'];
var CAMPI_OPZIONI = ['opzioni', 'options', 'risposte', 'choices'];
var CAMPI_CORRETTA = ['corretta', 'correctIndex', 'correct', 'isCorrect', 'correct_answer', 'rispostaCorretta'];
var CAMPI_RATIONALE = ['rationale', 'motivo', 'spiegazione', 'explanation'];

/** Tasto: legge il primo campo presente truthy. */
function primo(obj: any, campi: string[]): any {
  for (var i = 0; i < campi.length; i++) {
    var v = obj[campi[i]];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

function testo(v: any): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** Rende leggibile un valore che può essere testo, numero o oggetto. */
function etichettaOpzione(op: any): string {
  if (typeof op === 'string') return op.trim();
  if (typeof op === 'number') return String(op);
  if (op && typeof op === 'object') return testo(primo(op, ['text', 'testo', 'label', 'etichetta']));
  return '';
}

/**
 * Normalizza UNA domanda nel formato dell'app, oppure restituisce il motivo dello
 * scarto. `multipla` → indice come stringa (è così che funziona QuizBuilder);
 * `verofalso` → il TESTO dell'opzione (è così che funziona QuizBuilder: il campo
 * `corretta` contiene 'Vero'/'Falso', non l'indice).
 */
function normalizzaDomanda(grezza: any): { domanda?: any; motivo?: string } {
  if (!grezza || typeof grezza !== 'object') return { motivo: 'non è un oggetto domanda' };

  var t = testo(primo(grezza, CAMPI_TESTO));
  if (!t) return { motivo: 'manca il testo della domanda' };

  var opzioniGrezze = primo(grezza, CAMPI_OPZIONI);
  var opzioni: string[] = [];
  var indiceCorretto = -1;

  if (Array.isArray(opzioniGrezze)) {
    opzioniGrezze.forEach(function (op: any) {
      var lab = etichettaOpzione(op);
      if (lab) opzioni.push(lab);
      // isCorrect può stare sull'opzione: è il formato del file HTML segnalato.
      var giusta =
        op && typeof op === 'object' ? primo(op, ['isCorrect', 'corretta', 'correct', 'giusta']) === true : false;
      if (giusta && lab) indiceCorretto = opzioni.length - 1;
    });
  }

  // Risposta corretta dichiarata a parte: può essere l'indice o il testo.
  //
  // L'indice è 0-based, come nel formato del generatore IA dell'app (`"corretta":"0"`
  // = prima opzione) e come nei quiz scritti a mano (QuizBuilder salva String(j) con j
  // 0-based). Solo se il numero è FUORI dalla scala 0-based ma dentro quella 1-based
  // si prova la 1-based (i quiz che numerano le opzioni da 1 scrivono `corretta: 4` per
  // la quarta di quattro, che con la 0-based non esisterebbe). Prima si prova la
  // 0-based perché sbagliare in quel modo sposterebbe la risposta giusta.
  var corr = primo(grezza, CAMPI_CORRETTA);
  if (corr !== undefined && opzioni.length) {
    if (typeof corr === 'number' || (typeof corr === 'string' && /^\d+$/.test(corr.trim()))) {
      var n = parseInt(String(corr), 10);
      if (n >= 0 && n < opzioni.length) indiceCorretto = n;
      else if (n >= 1 && n <= opzioni.length) indiceCorretto = n - 1;
    } else {
      var testoCorr = String(corr).trim();
      var trovato = opzioni.indexOf(testoCorr);
      if (trovato >= 0 && indiceCorretto < 0) indiceCorretto = trovato;
    }
  }

  var hint = testo(primo(grezza, ['hint', 'suggerimento', 'aiuto']));
  var rationale = testo(primo(grezza, CAMPI_RATIONALE));

  if (!opzioni.length) {
    // Nessuna opzione → domanda APERTA (valutata dall'IA in useQuiz.ts).
    return {
      domanda: {
        tipo: 'aperta',
        testo: t,
        opzioni: [],
        corretta: '',
        // La spiegazione la riutilizziamo come suggerimento per lo studente: è il posto
        // dove il QuizPanel può già mostrarle senza inventare campi nuovi.
        hint: hint || rationale,
      },
    };
  }

  // Due opzioni che sono Vero/Falso → tipo vero/falso.
  var vf =
    opzioni.length === 2 &&
    opzioni
      .map(function (o) {
        return o.toLowerCase();
      })
      .every(function (o) {
        return o === 'vero' || o === 'falso' || o === 'true' || o === 'false';
      });

  if (vf) {
    var idxVF = indiceCorretto >= 0 ? indiceCorretto : 0;
    return {
      domanda: {
        tipo: 'verofalso',
        testo: t,
        opzioni: opzioni,
        corretta: opzioni[idxVF],
        hint: hint,
      },
    };
  }

  if (opzioni.length < 2) return { motivo: 'ha una sola opzione: serve almeno 2 per una multipla' };

  var domanda: any = { tipo: 'multipla', testo: t, opzioni: opzioni, hint: hint };
  // Senza risposta corretta la domanda sarebbe conteggiata ma non valutabile: in un
  // quiz è un errore, quindi si segnala invece di importare una domanda monca.
  if (indiceCorretto < 0) return { motivo: 'nessuna opzione segnata come corretta' };
  domanda.corretta = String(indiceCorretto);
  return { domanda: domanda };
}

/** Cerca l'array JSON dentro un file HTML (stile `const quizData = [...]`). */
function estraiDaHtml(testoHtml: string): any[] | null {
  // [ ... ] più profondo balancing: non basta /\[.*\]/ perché i testi delle opzioni
  // contengono parentesi quadre (le formule del quiz segnalato sono "[x]²").
  // La dichiarazione (const quizData = …) è il caso normale, ma il file può anche
  // scrivere `quizData=[…]` senza dichiarazione: non si pretende un JavaScript valido.
  var candidati = ['quizData', 'questions', 'domande', 'quiz'];
  for (var c = 0; c < candidati.length; c++) {
    var re = new RegExp('(?:var\\s+|let\\s+|const\\s+)?' + candidati[c] + '\\s*=\\s*\\[', 'i');
    var m = re.exec(testoHtml);
    if (!m) continue;
    var inizio = m.index + m[0].length - 1;
    var profondita = 0;
    var dentroStringa = false;
    var escape = false;
    for (var i = inizio; i < testoHtml.length; i++) {
      var ch = testoHtml[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') {
        dentroStringa = !dentroStringa;
        continue;
      }
      if (dentroStringa) continue;
      if (ch === '[' || ch === '{') profondita++;
      else if (ch === ']' || ch === '}') {
        profondita--;
        if (profondita === 0) {
          try {
            return JSON.parse(testoHtml.slice(inizio, i + 1));
          } catch (e) {
            return null; // JSON non valido: meglio fallire che importare mezzo file
          }
        }
      }
    }
  }
  return null;
}

/** Trova l'array di domande dentro un JSON già parsato. */
function listaDaJson(valore: any): any[] | null {
  if (Array.isArray(valore)) return valore;
  if (valore && typeof valore === 'object') {
    var chiavi = CAMPI_OPZIONI.concat(['domande', 'questions', 'quiz', 'items']);
    for (var i = 0; i < chiavi.length; i++) {
      if (Array.isArray(valore[chiavi[i]])) return valore[chiavi[i]];
    }
  }
  return null;
}

/**
 * Punto d'ingresso: testo grezzo (JSON o HTML) → domande nel formato dell'app.
 * Non lancia mai: un file non valido è un risultato con `errore`, non un'eccezione.
 */
export function importaQuizDaTesto(testoGrezzo: string): EsitoImport {
  var vuoto: EsitoImport = { domande: [], scartate: [], totaleLetture: 0 };
  var grezzo = String(testoGrezzo || '').trim();
  if (!grezzo) return Object.assign({}, vuoto, { errore: 'File vuoto' });

  var lista: any[] | null;
  var daHtml = false;

  if (grezzo[0] === '<' || /<html|<script/i.test(grezzo)) {
    lista = estraiDaHtml(grezzo);
    daHtml = true;
    if (!lista) return Object.assign({}, vuoto, { errore: 'Nell HTML non ho trovato un array JSON di domande (tipo `const quizData = [...]`)' });
  } else {
    var parsed: any;
    try {
      parsed = JSON.parse(grezzo);
    } catch (e) {
      return Object.assign({}, vuoto, { errore: 'JSON non valido: ' + (e as Error).message });
    }
    lista = listaDaJson(parsed);
    if (!lista) return Object.assign({}, vuoto, { errore: 'JSON valido ma nessuna lista di domande (atteso un array, o {domande:[…]})' });
  }

  var esito: EsitoImport = { domande: [], scartate: [], totaleLetture: lista.length };
  lista.forEach(function (g: any, i: number) {
    var r = normalizzaDomanda(g);
    if (r.domanda) esito.domande.push(r.domanda);
    else esito.scartate.push({ indice: i + 1, motivo: r.motivo || 'non riconosciuta' });
  });

  if (!esito.domande.length) {
    return Object.assign({}, esito, {
      errore:
        'Nessuna domanda importabile' +
        (esito.scartate.length ? ' (' + esito.scartate.length + ' scartate: la prima ' + esito.scartate[0].motivo + ')' : ''),
    });
  }
  // Fonte annotata solo per il messaggio finale del pannello, non finisce nel documento.
  (esito as any).fonte = daHtml ? 'html' : 'json';
  return esito;
}