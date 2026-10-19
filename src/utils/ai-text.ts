// utils/ai-text.ts · ScuolaBoard · helper di testo per l'AI (estratti da
// ai-services.ts). Funzioni pure e testabili:
// - pseudonimizeComments: pseudonimizzazione GDPR (Art. 4 par. 5) — i nomi
//   reali degli studenti vengono sostituiti con "Studente N" PRIMA di inviare
//   i commenti a Groq; la mappa consente di ripristinare i nomi alla ricezione.
//   La sostituzione copre anche i nomi CITATI dentro il testo di un altro
//   intervento (prima si raccolgono tutti gli autori, poi si riscrive ogni
//   testo) e le risposte annidate.
// - restoreNames: ripristina i nomi reali nella risposta dell'IA.
// - cleanAiMarkdown / cleanJsonStrings: pulizia del testo AI da markdown.

// Autori il cui "nome" NON è un nome di persona: restano com'erano.
// 'Prof' è l'alias che SB.myName() assegna ai docenti (nessun nome reale del
// prof raggiunge l'AI) e non va MAI mascherato dentro i testi: la parola
// "Prof" compare nelle istruzioni e nel parlato quotidiano, e sostituirla
// renderebbe i prompt incomprensibili al modello.
var AUTORI_NON_NOMI = ['Prof', 'Anonimo', '?', ''];

// Sotto i 3 caratteri il token è troppo ambiguo ("De", "Di", "La").
var MIN_LUNGHEZZA_TOKEN = 3;

function chiaveAutore(autore: unknown): string {
  var a = String(autore == null ? '' : autore).trim();
  return a || 'Anonimo';
}

function haProprieta(obj: Record<string, string>, chiave: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, chiave);
}

// Risposte di un commento: il modello dati le tiene ANNIDATE
// (card.commenti[i].risposte, vedi addReply in app-handlers.ts). Il terzo
// parametro di pseudonimizeComments esisteva già ma nessun chiamante lo
// passava, quindi le risposte non arrivavano proprio all'AI: ora si leggono da
// qui, con il parametro come fallback per i chiamanti legacy.
function risposteDiCommento(c: any, i: number, rispostePerCommento?: any): any[] {
  if (c && Array.isArray(c.risposte) && c.risposte.length) return c.risposte;
  var legacy = rispostePerCommento && rispostePerCommento[i];
  return Array.isArray(legacy) ? legacy : [];
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sostituisce `nome` con `alias` solo quando è una parola intera.
 * Perché non `\b`: è ASCII, e su un nome che finisce con una lettera accentata
 * ("Niccolò") il confine finale non esiste → il nome resterebbe in chiaro.
 * `\p{L}` con il flag `u` copre gli accenti; la classe negativa evita di
 * mascherare "Luca" dentro "Lucano".
 */
function sostituisciParola(testo: string, nome: string, alias: string, caseInsensitive: boolean): string {
  if (!testo || !nome) return testo;
  var re: RegExp;
  try {
    re = new RegExp(
      '(^|[^\\p{L}\\p{N}_])(' + escapeRegex(nome) + ')(?![\\p{L}\\p{N}_])',
      caseInsensitive ? 'giu' : 'gu'
    );
  } catch (e) {
    // Motori senza \p{...}: fallback ASCII. Meglio un nome non mascherato che
    // un'eccezione dentro un flusso AI.
    re = new RegExp('(^|[^A-Za-z0-9_])(' + escapeRegex(nome) + ')(?![A-Za-z0-9_])', caseInsensitive ? 'gi' : 'g');
  }
  return testo.replace(re, function (_m: string, pre: string) {
    return pre + alias;
  });
}

/**
 * Riscrive un testo sostituendo ogni nome noto con il suo alias.
 * Prima i nomi completi (dal più lungo, così "Mario Rossi" vince su "Mario"),
 * poi i singoli token. Il match sul nome completo è case-insensitive (una
 * firma "mario rossi" è inequivocabile); quello sul singolo token è
 * case-sensitive, così l'aggettivo "chiara" non diventa "Studente 3".
 */
function mascheraNomi(
  testo: string,
  elenco: string[],
  alias: Record<string, string>,
  tokenAlias: Record<string, string>
): string {
  var out = testo;
  var completi = elenco.slice().sort(function (a, b) {
    return b.length - a.length;
  });
  for (var i = 0; i < completi.length; i++) {
    var nomeCompleto = completi[i];
    var multiParola = nomeCompleto.indexOf(' ') !== -1;
    out = sostituisciParola(out, nomeCompleto, alias[nomeCompleto], multiParola);
  }
  var tokens = Object.keys(tokenAlias).sort(function (a, b) {
    return b.length - a.length;
  });
  for (var j = 0; j < tokens.length; j++) {
    out = sostituisciParola(out, tokens[j], tokenAlias[tokens[j]], false);
  }
  return out;
}

export function pseudonimizeComments(
  commenti: Array<{ autore: string; testo: string; [k: string]: any }>,
  escapeForPrompt: (_s: string) => string,
  rispostePerCommento?: Record<number, Array<{ autore: string; testo: string }>>
): { txt: string; mappaNomi: Record<string, string> } {
  var lista: any[] = Array.isArray(commenti) ? commenti : [];
  var mappaNomi: Record<string, string> = {};
  var alias: Record<string, string> = {};
  var elenco: string[] = [];

  function aliasDi(autore: any): string {
    var a = chiaveAutore(autore);
    if (haProprieta(alias, a)) return alias[a];
    if (AUTORI_NON_NOMI.indexOf(a) !== -1) {
      alias[a] = a;
      return a;
    }
    elenco.push(a);
    var nome = 'Studente ' + elenco.length;
    alias[a] = nome;
    mappaNomi[nome] = a;
    return nome;
  }

  // Prima passata: TUTTI gli autori (commenti + risposte), così un nome citato
  // in un commento scritto prima che il suo autore compaia viene comunque
  // mascherato.
  lista.forEach(function (c: any, i: number) {
    aliasDi(c && c.autore);
    risposteDiCommento(c, i, rispostePerCommento).forEach(function (r: any) {
      aliasDi(r && r.autore);
    });
  });

  // Token (nome o cognome da soli) → alias. In caso di omonimia vince il primo
  // autore comparso: l'ambiguità è intrinseca, ma la scelta è deterministica.
  var tokenAlias: Record<string, string> = {};
  elenco.forEach(function (nome: string) {
    nome.split(/\s+/).forEach(function (token: string) {
      if (token.length < MIN_LUNGHEZZA_TOKEN) return;
      if (AUTORI_NON_NOMI.indexOf(token) !== -1) return;
      if (haProprieta(tokenAlias, token)) return;
      tokenAlias[token] = alias[nome];
    });
  });

  function testoMascherato(t: any): string {
    return escapeForPrompt(mascheraNomi(String(t == null ? '' : t), elenco, alias, tokenAlias));
  }

  var txt = lista
    .map(function (c: any, i: number) {
      var riga = aliasDi(c && c.autore) + ': ' + testoMascherato(c && c.testo);
      var risposte = risposteDiCommento(c, i, rispostePerCommento);
      if (risposte.length) {
        riga +=
          '\n' +
          risposte
            .map(function (r: any) {
              return '  ↳ ' + aliasDi(r && r.autore) + ': ' + testoMascherato(r && r.testo);
            })
            .join('\n');
      }
      return riga;
    })
    .join('\n');

  return { txt: txt, mappaNomi: mappaNomi };
}

export function restoreNames(testo: string, mappaNomi: Record<string, string>): string {
  var result = testo;
  function capWords(s: string) {
    // Se già contiene una maiuscola, rispetta il dato originale (es. "De Luca", "D'Amico")
    if (/[A-ZÀ-Ù]/.test(s)) return s;
    return s.replace(/\b([a-zà-ù])/gi, function (c) {
      return c.toUpperCase();
    });
  }
  Object.keys(mappaNomi).forEach(function (alias) {
    var real = capWords(mappaNomi[alias]);
    // alias = "Studente N" -> estrai numero
    var m = alias.match(/(\d+)/);
    var num = m ? m[1] : null;
    // 1) sostituzione esatta "Studente N" (case-sensitive, per compatibilità)
    try {
      var exact = new RegExp('\\b' + alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
      result = result.replace(exact, real);
    } catch (e) {}
    // 2) sostituzione flessibile: (lo)? studente + spazi unicode + numero
    if (num) {
      try {
        var flex = new RegExp('(?:\\b(?:lo\\s+)?studente[\\s\\u00A0\\u202F]*0*' + num + '\\b)', 'gi');
        result = result.replace(flex, real);
      } catch (e) {}
    }
  });
  return result;
}

export function cleanAiMarkdown(txt: any) {
  if (!txt) return '';
  var lines = String(txt).split('\n');
  var cleanLines = [];

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];

    // Ignora le righe di separazione delle tabelle markdown (es: |---|---|)
    if (line.match(/^[\s|:-]+$/)) {
      continue;
    }

    // Se è presente una riga di tabella, rimuove i bordi "|" e unisce i dati in modo pulito
    if (line.indexOf('|') !== -1) {
      var parts = line
        .split('|')
        .map(function (p) {
          return p.trim();
        })
        .filter(Boolean);
      if (parts.length > 0) {
        line = parts.join('  ·  ');
      }
    }

    // Rimuove i titoli Markdown (#, ##, ###) lasciando solo il testo
    line = line.replace(/^#+\s+/, '');

    // Rimuove l'indicatore di citazione (>)
    line = line.replace(/^>\s+/, '');

    cleanLines.push(line);
  }

  var cleanTxt = cleanLines.join('\n');

  // Rimuove gli asterischi di grassetto/corsivo e trattini bassi senza rovinare il testo
  cleanTxt = cleanTxt.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleanTxt = cleanTxt.replace(/\*([^*]+)\*/g, '$1');
  cleanTxt = cleanTxt.replace(/__([^_]+)__/g, '$1');
  cleanTxt = cleanTxt.replace(/_([^_]+)_/g, '$1');

  // Rimuove eventuali apici di codice rimasti
  cleanTxt = cleanTxt.replace(/[`]{1,3}/g, '');

  return cleanTxt.trim();
}

export function cleanJsonStrings(obj: any): any {
  if (!obj) return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanJsonStrings);
  } else if (typeof obj === 'object') {
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'string') {
          obj[key] = cleanAiMarkdown(obj[key]);
        } else {
          obj[key] = cleanJsonStrings(obj[key]);
        }
      }
    }
  }
  return obj;
}
