// utils/ai-text.ts · ScuolaBoard · helper di testo per l'AI (estratti da
// ai-services.ts). Funzioni pure e testabili:
// - pseudonimizeComments: pseudonimizzazione GDPR (Art. 4 par. 5) — i nomi
//   reali degli studenti vengono sostituiti con "Studente N" PRIMA di inviare
//   i commenti a Groq; la mappa consente di ripristinare i nomi alla ricezione.
// - restoreNames: ripristina i nomi reali nella risposta dell'IA.
// - cleanAiMarkdown / cleanJsonStrings: pulizia del testo AI da markdown.

export function pseudonimizeComments(
  commenti: Array<{ autore: string; testo: string; [k: string]: any }>,
  escapeForPrompt: (_s: string) => string,
  rispostePerCommento?: Record<number, Array<{ autore: string; testo: string }>>
): { txt: string; mappaNomi: Record<string, string> } {
  var mappaNomi: Record<string, string> = {};
  var elenco: string[] = [];
  var txt = commenti
    .map(function (c: any) {
      var autore = c.autore || 'Anonimo';
      var idx = elenco.indexOf(autore);
      if (idx === -1) {
        elenco.push(autore);
        idx = elenco.length; // 1-based
      } else {
        idx = idx + 1;
      }
      var alias = 'Studente ' + idx;
      mappaNomi[alias] = autore;
      var riga = alias + ': ' + escapeForPrompt(c.testo || '');
      // Aggiungi le risposte (thread) se presenti
      if (rispostePerCommento) {
        var risposte = rispostePerCommento[commenti.indexOf(c)];
        if (risposte && risposte.length) {
          riga +=
            '\n' +
            risposte
              .map(function (r: any) {
                var rAutore = r.autore || 'Anonimo';
                var rIdx = elenco.indexOf(rAutore);
                if (rIdx === -1) {
                  elenco.push(rAutore);
                  rIdx = elenco.length;
                } else {
                  rIdx = rIdx + 1;
                }
                var rAlias = 'Studente ' + rIdx;
                mappaNomi[rAlias] = rAutore;
                return '  ↳ ' + rAlias + ': ' + escapeForPrompt(r.testo || '');
              })
              .join('\n');
        }
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
