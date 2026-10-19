// utils/pii.ts · ScuolaBoard · mascheramento deterministico delle PII
// strutturate prima dell'invio all'AI.
//
// PERCHÉ: la pseudonimizzazione dei commenti (utils/ai-text.ts) copre solo i
// NOMI DEGLI AUTORI. Un'email, un codice fiscale, un IBAN o un telefono scritti
// dentro il testo di un commento/risposta arrivano al modello così come sono:
// escapeForPrompt NON è anonimizzazione (serve a neutralizzare la prompt
// injection, non a togliere i dati personali).
//
// COME: regole deterministiche (nessun modello, nessuna dipendenza) applicate
// nell'unico punto che parla con il Worker (chiamaAI in ai-services.ts), così
// ogni chiamata — presente e futura — è coperta. I segnaposto sono tipizzati e
// numerati; la mappa consente di ripristinare i valori veri nella risposta.
//
// LIMITE DICHIARATO: i numeri FISSI scritti senza alcun separatore (es.
// "051123456") non vengono riconosciuti. È una scelta deliberata: una regola
// che accetti qualunque sequenza di cifre maschererebbe anche i numeri delle
// lezioni e delle risposte ai quiz, rendendo incomprensibile il prompt.

type Regola = { tipo: string; re: RegExp };

// I confini usano \p{L}/\p{N} (flag `u`) e non `\b`: su un numero seguito da
// una lettera accentata il confine ASCII non esiste e la regola mancherebbe il
// match. La classe negativa evita anche di tagliare un numero più lungo.
// Costruita con `new RegExp` in try/catch: se un motore non supporta
// lookbehind/\p{...} (Safari < 16.4) si degrada ai confini ASCII invece di far
// fallire il parsing del modulo (un letterale non sarebbe catturabile).
function regolaTelefono(): RegExp {
  try {
    return new RegExp(
      '(?<![\\p{L}\\p{N}])(?:\\+39[\\s./-]?)?(?:3\\d{2}[\\s./-]?\\d{3}[\\s./-]?\\d{3,4}|0\\d{1,3}[\\s./-]\\d{6,8})(?![\\p{L}\\p{N}])',
      'gu'
    );
  } catch (e) {
    return /(?:\+39[\s./-]?)?(?:3\d{2}[\s./-]?\d{3}[\s./-]?\d{3,4}|0\d{1,3}[\s./-]\d{6,8})/g;
  }
}

// L'ordine conta: prima le forme più specifiche (un IBAN contiene cifre che
// somigliano a un telefono). Ogni espressione è globale perché deve colpire
// tutte le occorrenze nello stesso prompt.
var REGOLE: Regola[] = [
  // Email: la parte locale può contenere + _ % . -
  { tipo: 'EMAIL', re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
  // IBAN italiano (27 caratteri: IT + 2 controllo + 1 CIN + 5 ABI + 5 CAB + 12)
  // e, più in generale, qualunque IBAN europeo plausibile.
  { tipo: 'IBAN', re: /\b(?=[A-Z]{2}\d{2})[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/gi },
  // Codice fiscale (16 caratteri): la struttura del CF è abbastanza rigida da
  // evitare falsi positivi senza dover calcolare il carattere di controllo.
  { tipo: 'CF', re: /\b[A-Z]{6}\d{2}[A-EHLMPRST]\d{2}[A-Z]\d{3}[A-Z]\b/gi },
  // Telefoni: cellulari (con o senza separatori) e fissi con un separatore tra
  // prefisso e numero (051/123456). Il fisso tutto attaccato è volutamente
  // escluso (vedi limite dichiarato in testa al file).
  {
    tipo: 'TEL',
    re: regolaTelefono(),
  },
];

function haProprieta(obj: Record<string, string>, chiave: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, chiave);
}

/**
 * Sostituisce le PII strutturate con segnaposto tipizzati e numerati
 * ([EMAIL_1], [CF_1], [IBAN_1], [TEL_1]).
 * La stessa occorrenza ripetuta riceve lo stesso segnaposto: un'email scritta
 * due volte non deve diventare [EMAIL_1] e [EMAIL_2].
 */
export function mascheraPII(testo: string): { txt: string; mappa: Record<string, string> } {
  var mappa: Record<string, string> = {};
  var out = String(testo == null ? '' : testo);
  if (!out) return { txt: out, mappa: mappa };

  var contatori: Record<string, number> = {};
  var gia: Record<string, string> = {};

  REGOLE.forEach(function (regola: Regola) {
    out = out.replace(regola.re, function (match: string) {
      // La chiave è case-insensitive: "Mario@X.it" e "mario@x.it" sono la
      // stessa PII e devono tornare con la grafia originale (è `match`).
      var chiave = regola.tipo + '|' + match.toLowerCase();
      if (haProprieta(gia, chiave)) return gia[chiave];
      contatori[regola.tipo] = (contatori[regola.tipo] || 0) + 1;
      var segnaposto = '[' + regola.tipo + '_' + contatori[regola.tipo] + ']';
      gia[chiave] = segnaposto;
      mappa[segnaposto] = match;
      return segnaposto;
    });
  });

  return { txt: out, mappa: mappa };
}

/**
 * Ripristina i valori veri al posto dei segnaposto nella risposta dell'IA.
 * I segnaposto sono sostituiti dal più lungo al più corto: altrimenti
 * [EMAIL_1] (9 caratteri) taglierebbe la testa di [EMAIL_10].
 */
export function ripristinaPII(testo: string, mappa: Record<string, string>): string {
  if (!testo || !mappa) return testo;
  var out = String(testo);
  var chiavi = Object.keys(mappa).sort(function (a, b) {
    return b.length - a.length;
  });
  chiavi.forEach(function (segnaposto: string) {
    var valore = mappa[segnaposto];
    // Il token nudo copre il caso in cui il modello toglie le parentesi quadre.
    // split/join (non replace) perché il valore può contenere "$" o "\".
    out = out.split(segnaposto).join(valore);
    out = out.split(segnaposto.slice(1, -1)).join(valore);
  });
  return out;
}
