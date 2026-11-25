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
  if (risposta === null || risposta === undefined) return -1;
  // Una stringa vuota (o fatta di soli spazi) NON è l'opzione 0: `Number(' ')` fa 0,
  // quindi una risposta vuota diventerebbe "ha scelto la prima opzione" — cioè giusta
  // su ogni domanda la cui risposta è la prima, e sbagliata su quelle con un'altra
  // risposta. Un carattere di spazio non deve valere un punto.
  var s = String(risposta).trim();
  if (s === '') return -1;
  var n = Number(s);
  // Solo indici INTERI: `opzioni[2.5]` è `undefined`, quindi 2.5 non è una risposta ma
  // un dato corrotto e non deve passare per "indice in scala".
  return isFinite(n) && Math.floor(n) === n ? n : -1;
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
 * TRUE se esiste una risposta che lo studente può DARE e che `rispostaGiusta` dice
 * giusta. È il criterio del denominatore, e non è una seconda copia della regola:
 * interroga `rispostaGiusta` con gli indici che la UI può inviare (0…N-1). Finché il
 * denominatore aveva un criterio suo ("l'indice è in scala") e il numeratore un altro
 * ("il testo coincide"), il punteggio poteva superare il totale: lo studente leggeva
 * «1/0» con la percentuale a 0, cioè un punteggio che si contraddice da solo.
 */
function rispostaRaggiungibile(d: any): boolean {
  var c = d && d.corretta;
  if (c === null || c === undefined || c === '') return false;
  var opzioni = (d && d.opzioni) || [];
  for (var i = 0; i < opzioni.length; i++) {
    if (rispostaGiusta(d, i)) return true;
  }
  // Una domanda chiusa ha opzioni; se non le ha (dato corrotto) resta la strada del
  // confronto diretto con `corretta`, la stessa che `rispostaGiusta` accetta.
  if (!opzioni.length && rispostaGiusta(d, c)) return true;
  return false;
}

/**
 * DENOMINATORE del punteggio: quante domande contano davvero. Unico criterio per il
 * punteggio salvato, quello mostrato allo studente, quello nella classifica del docente
 * e quello nella testata del pannello.
 *
 * Conta una domanda chiusa **solo se qualcuno può rispondere giusto**: le APERTE no, il
 * loro giudizio è un riscontro IA e non un voto (AGENTS.md regola 3, e la PrivacyModal
 * lo promette agli studenti); una chiusa senza risposta giusta nemmeno, perché sarebbe
 * un punto perso per tutti che nessuno può recuperare — e vale anche quando la risposta
 * c'è ma non è raggiungibile (`corretta: "7"` su 2 opzioni, oppure un testo che non è
 * fra le opzioni, come un vero/falso "Vero" su opzioni ["Giusto","Sbagliato"]).
 *
 * Prima ognuno dei quattro punti contava per conto suo: lo studente vedeva "3/4" mentre
 * il docente leggeva "3/3" sulla stessa card.
 */
export function quizTotale(domande: any[]): number {
  return (domande || []).filter(function (d: any) {
    if (!d || d.tipo === 'aperta') return false;
    return rispostaRaggiungibile(d);
  }).length;
}

/** Quante domande aperte hanno una risposta non vuota (cioè valutabili dall'IA). */
export function aperteConRisposta(domande: any[], risposte: any): number {
  return (domande || []).filter(function (d: any, i: number) {
    if (!d || d.tipo !== 'aperta') return false;
    return String((risposte || {})[i] || '').trim() !== '';
  }).length;
}