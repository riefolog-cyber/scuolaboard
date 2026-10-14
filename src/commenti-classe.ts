// commenti-classe.ts · ScuolaBoard · COMMENTI INDIPENDENTI PER CLASSE.
//
// Una card può essere condivisa fra più classi (classi: ['TUTTE'] o elenco).
// I commenti però sono discussioni DI CLASSE: quello che scrive la 3A non deve
// comparire alla 3B sulla stessa card.
//
// Soluzione: ogni commento (e ogni risposta) porta il campo `classe`
// (stringa o assente). La lettura filtra per il contesto di chi guarda, la
// scrittura lo imposta. I commenti legacy senza `classe` restano visibili a
// tutti: non si può sapere da quale classe sono nati e nasconderli
// cancellerebbe dati già mostrati (regola 14).
//
// Contesto di chi guarda (stessa logica del filtro card in cards.ts):
//  - simulaSt (prof che si finge studente) → previewClasse ('TUTTE' = tutte);
//  - prof normale → filterClasse ('tutte'/'_solo' = tutte);
//  - studente → classeCorrente (può essere null se non ha ancora scelto).
//
// Vista risultante:
//  - studente (o simulaSt, o prof con filtro su una classe): solo i commenti
//    della sua classe + i legacy senza classe;
//  - prof con filtro 'tutte'/'_solo': TUTTI i commenti, ognuno con l'etichetta
//    della classe (moderazione: non perde niente).
// Le risposte seguono il commento padre: si filtra solo il primo livello,
// così un thread non si spezza a metà.

export function classeContestoCommenti(opts: any): string | null {
  opts = opts || {};
  function pulisci(v: any): string | null {
    if (typeof v !== 'string') return null;
    var s = v.trim();
    if (!s) return null;
    if (s === 'TUTTE' || s === 'tutte' || s === '_solo') return null;
    return s;
  }
  if (opts.simulaSt) return pulisci(opts.previewClasse);
  if (opts.isProf) return pulisci(opts.filterClasse);
  if (typeof opts.classeCorrente === 'string') {
    var c = (opts.classeCorrente || '').trim();
    return c ? c : null;
  }
  return null;
}

// true = il docente guarda senza filtro di classe: vede tutto con etichetta.
export function mostraTuttiCommenti(opts: any): boolean {
  opts = opts || {};
  if (!opts.isProf || opts.simulaSt) return false;
  return classeContestoCommenti(opts) == null;
}

// Filtra i commenti di primo livello per il contesto. Con mostraTutti=true
// restituisce la lista così com'è (il docente modera tutte le classi).
export function commentiVisibili(commenti: any, contesto: string | null, mostraTutti?: boolean): any[] {
  if (!Array.isArray(commenti)) return [];
  if (mostraTutti) return commenti;
  if (!contesto) {
    // Chi non ha una classe (studente senza scelta, prof su 'tutte' filtrato
    // altrove) vede solo i commenti globali/legacy: non appartiene a nessuna
    // discussione di classe.
    return commenti.filter(function (cm: any) {
      return !cm || !cm.classe;
    });
  }
  return commenti.filter(function (cm: any) {
    if (!cm) return false;
    if (!cm.classe) return true; // legacy: visibile a tutti
    return String(cm.classe) === String(contesto);
  });
}

// Classe da scrivere su un NUOVO commento: il contesto, oppure null quando
// non c'è (commento globale del docente su 'tutte', legacy).
export function classePerNuovoCommento(contesto: string | null): string | null {
  return contesto || null;
}

// Classe da scrivere su una NUOVA risposta: eredita dal padre quando c'è
// (il thread resta unito anche se il docente risponde con un altro filtro),
// altrimenti usa il contesto corrente.
export function classePerNuovaRisposta(padre: any, contesto: string | null): string | null {
  if (padre && typeof padre.classe === 'string' && padre.classe.trim()) return padre.classe;
  return contesto || null;
}

// Cerca un commento (anche annidato) per id: serve a ereditare la classe del
// padre in addReply.
export function trovaCommento(lista: any, cmId: any): any {
  if (!Array.isArray(lista)) return null;
  var target = String(cmId);
  var trovato: any = null;
  (function cerca(arr: any) {
    for (var i = 0; i < arr.length && !trovato; i++) {
      var it = arr[i];
      if (!it) continue;
      if (String(it.id) === target) {
        trovato = it;
        return;
      }
      if (Array.isArray(it.risposte) && it.risposte.length) cerca(it.risposte);
    }
  })(lista);
  return trovato;
}
