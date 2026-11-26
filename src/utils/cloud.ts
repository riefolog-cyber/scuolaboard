// src/utils/cloud.ts — word cloud e statistiche pure
// Estratto da app-utils.ts (Fase 2d): nessuna dipendenza da Firestore/React.

import { visibileAClasse } from '../card-classi.ts';
import { commentiVisibili } from '../commenti-classe.ts';

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
// Il nome della classe dentro un target 'classe_<nome>': null per 'tutte' e per
// qualunque altra cosa (un target vuoto non è una classe).
function classeDelTarget(cardId: any): string | null {
  var s = String(cardId || '');
  if (s.indexOf('classe_') !== 0) return null;
  var nome = s.slice(7).trim();
  return nome ? nome : null;
}

// Filtra le card per il target del word cloud: 'tutte' oppure 'classe_<nome>'.
// Condiviso da buildWordCloud e collectCloudStats (stessa logica, niente duplicazione).
//
// Per la classe si usa `visibileAClasse` (card-classi.ts), non un `classi.indexOf`
// riscritto qui: il confronto grezzo sbagliava in tre casi, tutti reali — una card
// per TUTTE non entrava in NESSUN cloud di classe, una card tolta alla 3A
// (`classiEscluse`) continuava a contare come roba della 3A, e una card legacy
// senza `classi` (che vale per tutte) spariva. Il cloud di una classe è "quello
// che quella classe vede e scrive": il criterio è per forza lo stesso.
function filterCardsForCloud(cards: any[], cardId: string) {
  var classe = classeDelTarget(cardId);
  return (Array.isArray(cards) ? cards : []).filter(function (c: any) {
    if (!c || c.proposta) return false;
    if (classe === null) return String(cardId) === 'tutte';
    return visibileAClasse(c, classe);
  });
}

// I commenti che contano per il target. Con una classe vale la regola di
// commenti-classe.ts (i suoi commenti + i legacy senza classe): i commenti sono
// discussioni DI CLASSE, e il cloud della 3A non deve contenere quello che la 3B
// ha scritto sulla stessa card — sarebbe una media fra due discussioni.
function commentiDelTarget(commenti: any, classe: string | null): any[] {
  if (!Array.isArray(commenti)) return [];
  if (classe === null) {
    // Il target 'tutte' restituisce la lista grezza (il docente vede tutte le
    // discussioni), ma un elemento nullo — dato vecchio, scrittura sporca — qui
    // arrivava fino a `cm.testo` e diventava un TypeError che si portava via la
    // modale intera. Filtrare in QUESTO punto copre cloud e statistiche insieme.
    return commenti.filter(Boolean);
  }
  return commentiVisibili(commenti, classe);
}

export function buildWordCloud(cards: any[], cardId: string) {
  var testi: string[] = [];
  var classe = classeDelTarget(cardId);
  filterCardsForCloud(cards, cardId).forEach(function (c) {
    commentiDelTarget(c.commenti, classe).forEach(function (cm: any) {
      testi.push(cm.testo);
      // `risposte` può essere un valore sporco: senza il controllo sull'array
      // il `.forEach` è l'altro punto in cui il cloud si spegneva del tutto.
      if (Array.isArray(cm.risposte))
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
  var classe = classeDelTarget(cardId);
  var commentCount = 0;
  var studentSet = new Set<string>();
  filtered.forEach(function (c) {
    commentiDelTarget(c.commenti, classe).forEach(function (cm: any) {
      commentCount++;
      if (cm.autore) studentSet.add(cm.autore);
      // `risposte` può essere un valore sporco: senza il controllo sull'array
      // il `.forEach` è l'altro punto in cui il cloud si spegneva del tutto.
      if (Array.isArray(cm.risposte))
        cm.risposte.forEach(function (r: any) {
          commentCount++;
          if (r.autore) studentSet.add(r.autore);
        });
    });
  });
  return { cardCount: filtered.length, commentCount: commentCount, studentCount: studentSet.size };
}
