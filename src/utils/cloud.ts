// src/utils/cloud.ts — word cloud e statistiche pure
// Estratto da app-utils.ts (Fase 2d): nessuna dipendenza da Firestore/React.

var STOP_IT = new Set([
  'il',
  'la',
  'lo',
  'le',
  'gli',
  'i',
  'un',
  'una',
  'uno',
  'di',
  'del',
  'della',
  'dell',
  'dei',
  'delle',
  'degli',
  'a',
  'ad',
  'al',
  'alla',
  'all',
  'ai',
  'alle',
  'agli',
  'da',
  'dal',
  'dalla',
  'dall',
  'dai',
  'dalle',
  'dagli',
  'in',
  'nel',
  'nella',
  'nell',
  'nei',
  'nelle',
  'negli',
  'su',
  'sul',
  'sulla',
  'sull',
  'sui',
  'sulle',
  'sugli',
  'con',
  'per',
  'tra',
  'fra',
  'e',
  'ed',
  'o',
  'ma',
  'se',
  'che',
  'chi',
  'cui',
  'non',
  'ho',
  'ha',
  'hai',
  'hanno',
  'è',
  'sono',
  'sei',
  'siamo',
  'siete',
  'era',
  'erano',
  'mi',
  'ti',
  'ci',
  'vi',
  'si',
  'li',
  'ne',
  'me',
  'te',
  'lui',
  'lei',
  'noi',
  'voi',
  'loro',
  'questo',
  'questa',
  'questi',
  'queste',
  'quello',
  'quella',
  'quelli',
  'quelle',
  'molto',
  'più',
  'anche',
  'come',
  'quando',
  'dove',
  'perché',
  'perche',
  'poi',
  'già',
  'gia',
  'ancora',
  'sempre',
  'mai',
  'tutto',
  'tutti',
  'tutta',
  'tutte',
  'mio',
  'mia',
  'miei',
  'mie',
  'tuo',
  'tua',
  'tuoi',
  'tue',
  'suo',
  'sua',
  'suoi',
  'sue',
  'nostro',
  'nostra',
  'nostri',
  'nostre',
  'fare',
  'fatto',
  'avere',
  'essere',
  'stato',
  'stata',
  'stati',
  'state',
  'cosa',
  'però',
  'pero',
  'quindi',
  'allora',
  'anzi',
  'invece',
  'oppure',
  'né',
  'sia',
  'può',
  'puo',
  'deve',
  'vuole',
  'vero',
  'modo',
  'parte',
  'volta',
  'caso',
  'prima',
  'dopo',
  'qui',
  'lì',
  'ora',
]);
// Filtra le card per il target del word cloud: 'tutte' oppure 'classe_<nome>'.
// Condiviso da buildWordCloud e collectCloudStats (stessa logica, niente duplicazione).
function filterCardsForCloud(cards: any[], cardId: string) {
  return cards.filter(function (c) {
    if (c.proposta) return false;
    if (cardId === 'tutte') return true;
    if (String(cardId).indexOf('classe_') === 0) {
      var classeName = cardId.slice(7);
      return (c.classi || []).includes(classeName);
    }
    return false;
  });
}

export function buildWordCloud(cards: any[], cardId: string) {
  var testi: string[] = [];
  filterCardsForCloud(cards, cardId)
    .forEach(function (c) {
      (c.commenti || []).forEach(function (cm: any) {
        testi.push(cm.testo);
        if (cm.risposte)
          cm.risposte.forEach(function (r: any) {
            testi.push(r.testo);
          });
      });
    });
  var freq: Record<string, number> = {};
  // Rimuove URL, poi sostituisce punteggiatura (escluse lettere unicode) con spazi, poi divide
  var cleanedText = testi
    .join(' ')
    .toLowerCase()
    .replace(/(https?:\/\/[^\s]+)/g, '') // Rimuove URL
    .replace(/[^\p{L}\s]/gu, ' '); // Sostituisce la punteggiatura con spazi, supporta unicode
  cleanedText
    .split(/\s+/)
    .filter(function (w) {
      return w.length >= 3 && !STOP_IT.has(w);
    })
    .forEach(function (w) {
      freq[w] = (freq[w] || 0) + 1;
    });
  // freq è tipizzato Record<string, number> (non l'oggetto letterale {} che
  // inferirebbe Record<string, unknown> → Object.entries non ammetterebbe
  // confronti aritmetici).
  var entries = Object.entries(freq);
  return entries
    .filter(function (e) {
      return e[1] > 0;
    })
    .sort(function (a, b) {
      return b[1] - a[1];
    })
    .slice(0, 10);
}
export function collectCloudStats(cards: any[], cardId: string) {
  var filtered = filterCardsForCloud(cards, cardId);
  var commentCount = 0;
  var studentSet = new Set<string>();
  filtered.forEach(function (c) {
    (c.commenti || []).forEach(function (cm: any) {
      commentCount++;
      if (cm.autore) studentSet.add(cm.autore);
      if (cm.risposte)
        cm.risposte.forEach(function (r: any) {
          commentCount++;
          if (r.autore) studentSet.add(r.autore);
        });
    });
  });
  return { cardCount: filtered.length, commentCount: commentCount, studentCount: studentSet.size };
}
