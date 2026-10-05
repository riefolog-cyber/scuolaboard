// quiz-corretta.ts · ScuolaBoard · l'unica regola di "questa risposta è giusta?"
//
// Perché questo file esiste. Il confronto fra la risposta dello studente e `corretta`
// era scritto TRE volte, con tre criteri diversi:
//
//   useQuiz.ts (punteggio)  →  String(a) === String(b), con fallback sul testo
//   QuizPanel prof (segno)  →  a === b            (rigido: numero contro stringa)
//   QuizPanel studente      →  String(a) === String(b)  (senza il fallback)
//
// Conseguenze reali, viste nei pannelli: il PUNTEGGIO diceva 2/6 mentre il pannello
// docente segnava tutte ❌ (numeri contro stringhe), e sui quiz vero/falso — dove
// `corretta` è il TESTO 'Vero'/'Falso' e non un indice — lo studente vedeva "sbagliata"
// anche avendo risposto bene. Due pannelli che si contraddicono è il peggiore modo di
// scoprirlo: la copia che si aggiorna è sempre quella giusta.
//
// `corretta` ha due significati (vedi AGENTS.md regola 12): per `multipla` è l'indice
// 0-based come stringa, per `verofalso` è il testo dell'opzione. La risposta dello
// studente invece è SEMPRE l'indice dell'opzione cliccata (un numero). Qui si
// normalizza una volta sola.
//
// Modulo PURO: nessuna React, nessun DOM, nessun hook. Se serve correggerlo, si
// corregge qui e in un posto solo.

/** L'indice dell'opzione che lo studente ha scelto, o -1 se non è un indice. */
export function indiceDi(risposta: any): number {
  if (risposta === null || risposta === undefined || risposta === '') return -1;
  var n = Number(risposta);
  return isNaN(n) ? -1 : n;
}

/** Il testo dell'opzione indicata dalla risposta (per mostrarla all'insegnante). */
export function testoRisposta(d: any, risposta: any): string {
  if (risposta === null || risposta === undefined || risposta === '') return '-';
  var opzioni = (d && d.opzioni) || [];
  var n = indiceDi(risposta);
  if (n >= 0 && opzioni[n] != null) return String(opzioni[n]);
  // Risposta non numerica: si mostra come arriva (non si inventa niente).
  return String(risposta);
}

/**
 * Il testo della RISPOSTA GIUSTA, qualunque sia il formato di `corretta`:
 * per `multipla` è l'indice → si risolve sull'opzione; per `verofalso` è già il testo.
 */
export function testoCorretta(d: any): string {
  var c = d && d.corretta;
  if (c === null || c === undefined || c === '') return '';
  var opzioni = (d && d.opzioni) || [];
  var n = indiceDi(c);
  if (n >= 0 && opzioni[n] != null) return String(opzioni[n]);
  return String(c);
}

/**
 * TRUE se la risposta dello studente è quella giusta. Unico criterio per punteggio,
 * pannello docente e pannello studente.
 */
export function rispostaGiusta(d: any, risposta: any): boolean {
  if (!d) return false;
  var corretta = d.corretta;
  if (risposta === null || risposta === undefined || risposta === '') return false;
  // Una domanda senza risposta giusta non è valutabile: mai "giusta" (buildQuizDomande
  // non controlla `corretta`, quindi può capitare).
  if (corretta === null || corretta === undefined || corretta === '') return false;

  // 1) multipla: lo studente clicca l'indice (numero), `corretta` è l'indice come
  //    stringa. Il confronto passa per String() perché i due hanno tipi diversi:
  //    è esattamente qui che il pannello docente sbagliava.
  if (String(risposta) === String(corretta)) return true;

  var opzioni = (d && d.opzioni) || [];
  // 2) vero/falso: `corretta` è il testo, la risposta è l'indice → si risolve sull'opzione.
  var n = indiceDi(risposta);
  if (n >= 0 && opzioni[n] != null && String(opzioni[n]) === String(corretta)) return true;

  // 3) difensivo: risposta salvata come TESTO invece che come indice (dati più vecchi,
  //    o un importatore che ha usato i testi). Non costa nulla e evita un "sbagliata"
  //    su una risposta che invece è giusta.
  var comeTesto = opzioni.indexOf(risposta);
  if (comeTesto >= 0 && indiceDi(corretta) === comeTesto) return true;

  return false;
}

/**
 * DENOMINATORE del punteggio: quante domande contano davvero. Unico criterio per il
 * punteggio salvato, quello mostrato allo studente, quello nella classifica del docente
 * e quello nella testata del pannello.
 *
 * Contano le domande chiuse e valutabili (multipla/verofalso con una risposta giusta
 * impostata). NON contano:
 *  - le domande APERTE: il loro giudizio è dell'IA, che è un riscontro e non un voto
 *    (AGENTS.md regola 3, e la PrivacyModal lo promette agli studenti). Se contassero,
 *    ogni domanda aperta sarebbe un punto perso che lo studente non può recuperare;
 *  - le domande senza risposta giusta: nessuno può azzeccarle, quindi sarebbero un
 *    punto perso per tutti.
 *
 * Prima ognuno dei quattro punti contava per conto suo: lo studente vedeva "3/4" mentre
 * il docente leggeva "3/3" sulla stessa card.
 */
export function quizTotale(domande: any[]): number {
  return (domande || []).filter(function (d: any) {
    if (!d || d.tipo === 'aperta') return false;
    var c = d.corretta;
    if (c === null || c === undefined || c === '') return false;
    // Risposta giusta FUORI scala: su una multipla con 4 opzioni, `corretta: "7"`
    // non è azzeccabile da nessuno. Contarla sarebbe un punto perso per tutti, e
    // nessuno lo può recuperare. (Per vero/falso la scala è il testo, non l'indice.)
    if (d.tipo === 'multipla') {
      var n = indiceDi(c);
      var opzioni = (d && d.opzioni) || [];
      if (n < 0 || n >= opzioni.length) return false;
    }
    return true;
  }).length;
}

/** Quante domande aperte hanno una risposta non vuota (cioè valutabili dall'IA). */
export function aperteConRisposta(domande: any[], risposte: any): number {
  return (domande || []).filter(function (d: any, i: number) {
    if (!d || d.tipo !== 'aperta') return false;
    return String((risposte || {})[i] || '').trim() !== '';
  }).length;
}